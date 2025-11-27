from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse

from app.api.deps import (
    get_current_user_with_tenant,
    get_razorpay_connection_service,
    get_razorpay_payment_service,
    get_sales_service,
)
from app.models.user import User
from app.schemas.razorpay_connection import (
    RazorpayConnectionCreateRequest,
    RazorpayConnectionStatus,
)
from app.schemas.razorpay_payment import (
    RazorpayOrderRequest,
    RazorpayOrderResponse,
    RazorpayPaymentStatusResponse,
)
from app.services.razorpay import (
    RazorpayConnectionService,
    RazorpayPaymentService,
    RazorpayIntegrationError,
    RazorpayValidationError,
)
from app.services.sales_service import SalesService

router = APIRouter(prefix="/razorpay", tags=["razorpay"])


def _ensure_store_context(user: User) -> UUID:
    if not user.store_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not assigned to any store",
        )
    return user.store_id


@router.get("/connection", response_model=RazorpayConnectionStatus)
def get_razorpay_connection_status(
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant),
    service: RazorpayConnectionService = Depends(get_razorpay_connection_service),
) -> RazorpayConnectionStatus:
    """
    Return sanitized Razorpay connection status for the authenticated user's store.
    """
    user, tenant_id = user_tenant
    store_id = _ensure_store_context(user)
    status_payload = service.get_connection_status(tenant_id=tenant_id, store_id=store_id)
    return RazorpayConnectionStatus(**status_payload)


@router.post("/connect", response_model=RazorpayConnectionStatus)
def connect_razorpay(
    payload: RazorpayConnectionCreateRequest,
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant),
    service: RazorpayConnectionService = Depends(get_razorpay_connection_service),
) -> RazorpayConnectionStatus:
    """
    Allow a store manager to validate and store Razorpay credentials for their store.
    """
    user, tenant_id = user_tenant

    if user.role != "manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only store managers can connect Razorpay credentials",
        )

    store_id = _ensure_store_context(user)

    try:
        service.connect_store(
            tenant_id=tenant_id,
            store_id=store_id,
            manager_id=user.id,
            key_id=payload.key_id,
            key_secret=payload.key_secret,
            mode=payload.mode,
        )
    except RazorpayValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except RazorpayIntegrationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    status_payload = service.get_connection_status(tenant_id=tenant_id, store_id=store_id)
    return RazorpayConnectionStatus(**status_payload)


@router.post("/orders", response_model=RazorpayOrderResponse)
def create_razorpay_order(
    payload: RazorpayOrderRequest,
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant),
    sales_service: SalesService = Depends(get_sales_service),
    payment_service: RazorpayPaymentService = Depends(get_razorpay_payment_service),
) -> RazorpayOrderResponse:
    """
    Create a Razorpay order for a previously created sale.
    """
    user, tenant_id = user_tenant
    sale = sales_service.get_sale(payload.sale_id, tenant_id)
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found",
        )

    if user.role != "super_admin" and user.store_id and sale.store_id != user.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this sale",
        )

    try:
        _, order_payload, key_id = payment_service.create_order_for_sale(
            sale,
            amount_paise=payload.amount_override_paise,
            receipt=payload.receipt,
        )
    except RazorpayIntegrationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc

    return RazorpayOrderResponse(
        sale_id=sale.id,
        order_id=order_payload["order_id"],
        amount=order_payload["amount"],
        currency=order_payload["currency"],
        key_id=key_id,
        receipt=order_payload.get("receipt"),
    )


@router.get("/orders/{sale_id}/status", response_model=RazorpayPaymentStatusResponse)
def get_razorpay_payment_status(
    sale_id: UUID,
    user_tenant: tuple[User, UUID] = Depends(get_current_user_with_tenant),
    sales_service: SalesService = Depends(get_sales_service),
    payment_service: RazorpayPaymentService = Depends(get_razorpay_payment_service),
) -> RazorpayPaymentStatusResponse:
    """
    Return the stored Razorpay payment status for a sale.
    """
    user, tenant_id = user_tenant

    sale = sales_service.get_sale(sale_id, tenant_id)
    if not sale:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Sale not found",
        )

    if user.role != "super_admin" and user.store_id and sale.store_id != user.store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this sale",
        )

    try:
        status_payload = payment_service.get_status_for_sale(sale_id)
    except RazorpayIntegrationError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc

    return status_payload


@router.post("/callback")
async def razorpay_callback(
    request: Request,
    payment_service: RazorpayPaymentService = Depends(get_razorpay_payment_service),
    sales_service: SalesService = Depends(get_sales_service),
):
    """
    Callback endpoint invoked by Razorpay Checkout redirect flow.
    """
    form = await request.form()
    payment_id = form.get("razorpay_payment_id")
    order_id = form.get("razorpay_order_id")
    signature = form.get("razorpay_signature")

    if not payment_id or not order_id or not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing Razorpay payment parameters",
        )

    try:
        payment = payment_service.verify_and_update_payment(
            order_id=order_id,
            payment_id=payment_id,
            signature=signature,
        )
    except RazorpayValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except RazorpayIntegrationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    # Mark sale as paid
    sales_service.update_payment_status(
        sale_id=payment.sale_id,
        tenant_id=payment.tenant_id,
        payment_status="paid",
    )

    return JSONResponse(
        {
            "status": "success",
            "sale_id": str(payment.sale_id),
            "order_id": payment.razorpay_order_id,
            "payment_id": payment.razorpay_payment_id,
        }
    )
