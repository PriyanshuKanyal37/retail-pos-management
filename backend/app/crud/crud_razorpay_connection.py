from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.razorpay_connection import RazorpayConnection
from app.schemas.razorpay_connection import (
    RazorpayConnectionCreateRequest,
    RazorpayConnectionUpdateRequest,
)


class CRUDRazorpayConnection(
    CRUDBase[RazorpayConnection, RazorpayConnectionCreateRequest, RazorpayConnectionUpdateRequest]
):
    def get_active_for_store(
        self,
        db: Session,
        *,
        tenant_id: UUID,
        store_id: UUID,
        active_only: bool = True,
    ) -> Optional[RazorpayConnection]:
        query = select(self.model).where(
            self.model.tenant_id == tenant_id,
            self.model.store_id == store_id,
        )

        if active_only:
            query = query.where(self.model.is_active.is_(True))

        query = query.order_by(self.model.created_at.desc()).limit(1)
        result = db.execute(query)
        return result.scalar_one_or_none()

    def deactivate_connections(
        self,
        db: Session,
        *,
        tenant_id: UUID,
        store_id: UUID,
    ) -> None:
        stmt = (
            update(self.model)
            .where(
                self.model.tenant_id == tenant_id,
                self.model.store_id == store_id,
                self.model.is_active.is_(True),
            )
            .values(is_active=False, replaced_at=datetime.utcnow())
        )
        db.execute(stmt)
        db.commit()


crud_razorpay_connection = CRUDRazorpayConnection(RazorpayConnection)
