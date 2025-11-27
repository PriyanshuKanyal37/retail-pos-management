from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.razorpay_payment import RazorpayPayment
from app.schemas.razorpay_payment import (
    RazorpayOrderCreate,
    RazorpayPaymentUpdate,
)


class CRUDRazorpayPayment(
    CRUDBase[RazorpayPayment, RazorpayOrderCreate, RazorpayPaymentUpdate]
):
    def get_by_order_id(
        self,
        db: Session,
        *,
        order_id: str,
        tenant_id: UUID | None = None,
    ) -> Optional[RazorpayPayment]:
        query = select(self.model).where(self.model.razorpay_order_id == order_id)
        if tenant_id:
            query = query.where(self.model.tenant_id == tenant_id)
        result = db.execute(query)
        return result.scalar_one_or_none()

    def get_latest_for_sale(
        self,
        db: Session,
        *,
        sale_id: UUID,
    ) -> Optional[RazorpayPayment]:
        query = (
            select(self.model)
            .where(self.model.sale_id == sale_id)
            .order_by(self.model.created_at.desc())
            .limit(1)
        )
        result = db.execute(query)
        return result.scalar_one_or_none()


crud_razorpay_payment = CRUDRazorpayPayment(RazorpayPayment)
