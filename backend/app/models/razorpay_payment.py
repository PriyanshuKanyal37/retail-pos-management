from datetime import datetime
from typing import Optional, TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    DateTime,
    ForeignKey,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.sale import Sale
    from app.models.store import Store
    from app.models.tenant import Tenant


class RazorpayPayment(Base):
    __tablename__ = "razorpay_payments"
    __table_args__ = (
        UniqueConstraint("razorpay_order_id", name="uq_razorpay_order_id"),
        UniqueConstraint("razorpay_payment_id", name="uq_razorpay_payment_id"),
    )

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
    sale_id: Mapped[UUID] = mapped_column(
        PGUUID(as_uuid=True),
        ForeignKey("sales.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    razorpay_order_id: Mapped[str] = mapped_column(String(255), nullable=False)
    razorpay_payment_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    razorpay_signature: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    amount_paise: Mapped[int] = mapped_column(BigInteger, nullable=False)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="INR")
    receipt: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    status: Mapped[str] = mapped_column(String(30), nullable=False, default="created")
    attempts: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    error_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    error_description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )
    captured_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    tenant = relationship("Tenant", back_populates="razorpay_payments")
    store = relationship("Store", back_populates="razorpay_payments")
    sale = relationship("Sale", back_populates="razorpay_payments")
