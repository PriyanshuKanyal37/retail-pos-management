import logging
from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.core.config import settings
from app.crud.crud_razorpay_connection import crud_razorpay_connection
from app.crud.crud_razorpay_payment import crud_razorpay_payment
from app.models.razorpay_connection import RazorpayConnection
from app.models.razorpay_payment import RazorpayPayment
from app.models.sale import Sale
from app.schemas.razorpay_payment import (
    RazorpayOrderCreate,
    RazorpayPaymentStatusResponse,
    RazorpayPaymentUpdate,
)

logger = logging.getLogger(__name__)


class RazorpayIntegrationError(Exception):
    """Base exception for Razorpay connectivity issues."""


class RazorpayValidationError(RazorpayIntegrationError):
    """Raised when provided Razorpay credentials are invalid."""


def _import_razorpay_client():
    try:
        import razorpay  # type: ignore

        return razorpay
    except ImportError as exc:  # pragma: no cover - runtime dependency issue
        raise RazorpayIntegrationError(
            "Razorpay SDK is not installed. Please add 'razorpay' to backend requirements."
        ) from exc


class RazorpayConnectionService:
    """
    Handles persistence and validation for Razorpay API credentials
    on a per-tenant and per-store basis.
    """

    def __init__(self, db: Session):
        self.db = db

    def _validate_credentials(self, key_id: str, key_secret: str) -> None:
        """
        Optionally validate Razorpay credentials by making an authenticated API call.
        """
        if not getattr(settings, "razorpay_enable_validation", True):
            logger.info("Skipping Razorpay credential validation per configuration")
            return

        razorpay = _import_razorpay_client()
        client = razorpay.Client(auth=(key_id, key_secret))

        try:
            client.order.all({"count": 1})
        except razorpay.errors.BadRequestError as exc:  # type: ignore[attr-defined]
            raise RazorpayValidationError("Invalid Razorpay API key or secret") from exc
        except Exception as exc:  # pragma: no cover - network errors
            raise RazorpayIntegrationError(f"Failed to validate Razorpay credentials: {exc}") from exc

    def get_active_connection(
        self,
        *,
        tenant_id: UUID,
        store_id: UUID,
    ) -> Optional[RazorpayConnection]:
        return crud_razorpay_connection.get_active_for_store(
            self.db,
            tenant_id=tenant_id,
            store_id=store_id,
            active_only=True,
        )

    def get_connection_status(
        self,
        *,
        tenant_id: UUID,
        store_id: UUID,
    ) -> dict:
        connection = self.get_active_connection(tenant_id=tenant_id, store_id=store_id)

        if not connection:
            return {
                "is_connected": False,
                "mode": None,
                "connected_at": None,
                "updated_at": None,
                "key_id_last4": None,
            }

        key_id = connection.razorpay_key_id or ""
        last4 = key_id[-4:] if key_id else None

        return {
            "is_connected": True,
            "mode": connection.mode,
            "connected_at": connection.connected_at,
            "updated_at": connection.updated_at,
            "key_id_last4": last4,
        }

    def connect_store(
        self,
        *,
        tenant_id: UUID,
        store_id: UUID,
        manager_id: UUID,
        key_id: str,
        key_secret: str,
        mode: str = "test",
    ) -> RazorpayConnection:
        """
        Validate credentials (if enabled) and persist the new connection,
        deactivating any previously active rows.
        """
        self._validate_credentials(key_id, key_secret)

        # Deactivate existing active connections for this store
        crud_razorpay_connection.deactivate_connections(
            self.db,
            tenant_id=tenant_id,
            store_id=store_id,
        )

        connection = RazorpayConnection(
            tenant_id=tenant_id,
            store_id=store_id,
            manager_id=manager_id,
            razorpay_key_id=key_id.strip(),
            razorpay_key_secret=key_secret.strip().encode("utf-8"),
            mode=mode,
            is_active=True,
            connected_at=datetime.utcnow(),
        )

        self.db.add(connection)
        self.db.commit()
        self.db.refresh(connection)
        logger.info(
            "Razorpay connected for tenant %s store %s by manager %s",
            tenant_id,
            store_id,
            manager_id,
        )
        return connection

    def get_client_for_store(
        self,
        *,
        tenant_id: UUID,
        store_id: UUID,
    ):
        connection = self.get_active_connection(tenant_id=tenant_id, store_id=store_id)
        if not connection:
            raise RazorpayIntegrationError("Razorpay is not connected for this store")

        razorpay = _import_razorpay_client()
        try:
            secret = connection.razorpay_key_secret.decode("utf-8")
        except Exception as exc:  # pragma: no cover - unexpected encoding issues
            raise RazorpayIntegrationError("Stored Razorpay secret is invalid") from exc
        client = razorpay.Client(auth=(connection.razorpay_key_id, secret))
        return client, connection


class RazorpayPaymentService:
    """
    Handles Razorpay order creation, signature verification,
    and payment reconciliation for sales.
    """

    def __init__(self, db: Session):
        self.db = db
        self.connection_service = RazorpayConnectionService(db)

    def _serialize_amount(self, sale: Sale) -> int:
        total = Decimal(str(sale.total or 0))
        amount = int(total * 100)
        if amount <= 0:
            raise RazorpayIntegrationError("Sale total must be greater than zero for Razorpay payment")
        return amount

    def create_order_for_sale(
        self,
        sale: Sale,
        *,
        amount_paise: Optional[int] = None,
        receipt: Optional[str] = None,
        notes: Optional[dict] = None,
    ) -> tuple[RazorpayPayment, dict, str]:
        client, connection = self.connection_service.get_client_for_store(
            tenant_id=sale.tenant_id,
            store_id=sale.store_id,
        )

        calculated_amount = amount_paise or self._serialize_amount(sale)
        order_payload = {
            "amount": calculated_amount,
            "currency": "INR",
            "receipt": receipt or sale.invoice_no,
            "payment_capture": 1,
            "notes": {
                "sale_id": str(sale.id),
                "tenant_id": str(sale.tenant_id),
                "store_id": str(sale.store_id),
                **(notes or {}),
            },
        }

        try:
            order = client.order.create(order_payload)
        except Exception as exc:
            logger.exception("Failed to create Razorpay order for sale %s", sale.id)
            raise RazorpayIntegrationError(f"Failed to create Razorpay order: {exc}") from exc

        payment_record = crud_razorpay_payment.create(
            self.db,
            obj_in=RazorpayOrderCreate(
                tenant_id=sale.tenant_id,
                store_id=sale.store_id,
                sale_id=sale.id,
                razorpay_order_id=order["id"],
                amount_paise=order["amount"],
                currency=order.get("currency", "INR"),
                receipt=order.get("receipt"),
                status=order.get("status", "created"),
                attempts=order.get("attempts", 0),
            ),
        )

        response_payload = {
            "order_id": order["id"],
            "amount": order["amount"],
            "currency": order.get("currency", "INR"),
            "key_id": connection.razorpay_key_id,
            "receipt": order.get("receipt"),
        }
        return payment_record, response_payload, connection.razorpay_key_id

    def verify_and_update_payment(
        self,
        *,
        order_id: str,
        payment_id: str,
        signature: str,
    ) -> RazorpayPayment:
        payment = crud_razorpay_payment.get_by_order_id(
            self.db,
            order_id=order_id,
        )
        if not payment:
            raise RazorpayIntegrationError("No Razorpay payment record found for this order")

        if payment.razorpay_payment_id and payment.razorpay_payment_id != payment_id:
            raise RazorpayIntegrationError("Payment already recorded for this order")

        client, _ = self.connection_service.get_client_for_store(
            tenant_id=payment.tenant_id,
            store_id=payment.store_id,
        )
        params_dict = {
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        }

        try:
            client.utility.verify_payment_signature(params_dict)
        except Exception as exc:
            raise RazorpayValidationError("Failed to verify Razorpay payment signature") from exc

        payment_details = {}
        try:
            payment_details = client.payment.fetch(payment_id)
        except Exception as exc:
            logger.warning("Unable to fetch Razorpay payment details for %s: %s", payment_id, exc)

        status = payment_details.get("status", "captured")
        update_payload = RazorpayPaymentUpdate(
            status=status,
            razorpay_payment_id=payment_id,
            razorpay_signature=signature,
            attempts=payment_details.get("attempts"),
            error_code=payment_details.get("error_code"),
            error_description=payment_details.get("error_description"),
            captured_at=datetime.utcnow() if status == "captured" else None,
        )

        updated_payment = crud_razorpay_payment.update(
            self.db,
            db_obj=payment,
            obj_in=update_payload,
        )
        return updated_payment

    def get_status_for_sale(self, sale_id: UUID) -> RazorpayPaymentStatusResponse:
        payment = crud_razorpay_payment.get_latest_for_sale(self.db, sale_id=sale_id)
        if not payment:
            raise RazorpayIntegrationError("No Razorpay order found for this sale")

        return RazorpayPaymentStatusResponse(
            sale_id=payment.sale_id,
            status=payment.status,
            amount_paise=payment.amount_paise,
            currency=payment.currency,
            razorpay_order_id=payment.razorpay_order_id,
            razorpay_payment_id=payment.razorpay_payment_id,
            captured_at=payment.captured_at,
            updated_at=payment.updated_at,
        )
