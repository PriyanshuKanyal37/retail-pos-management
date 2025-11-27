from datetime import datetime
from typing import Optional, TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, LargeBinary, String, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.store import Store
    from app.models.user import User
    from app.models.tenant import Tenant


class RazorpayConnection(Base):
    __tablename__ = "razorpay_connections"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    store_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("stores.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    manager_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    razorpay_key_id: Mapped[str] = mapped_column(String(255), nullable=False)
    razorpay_key_secret: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)

    mode: Mapped[str] = mapped_column(String(10), nullable=False, server_default="test")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
    connected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    replaced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant = relationship("Tenant", back_populates="razorpay_connections")
    store = relationship("Store", back_populates="razorpay_connections")
    manager = relationship("User")

    def mask_key_id(self) -> str:
        """Return key ID with only last 4 characters visible."""
        if not self.razorpay_key_id:
            return ""
        if len(self.razorpay_key_id) <= 4:
            return self.razorpay_key_id
        return f"{'*' * (len(self.razorpay_key_id) - 4)}{self.razorpay_key_id[-4:]}"
