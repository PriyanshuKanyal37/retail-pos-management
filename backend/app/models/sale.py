from datetime import datetime
from typing import Optional, TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.store import Store


class Sale(Base):
    __tablename__ = "sales"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    store_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("stores.id"), nullable=False)
    invoice_no: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    invoice_pdf_url: Mapped[Optional[str]] = mapped_column(Text)
    customer_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("customers.id", ondelete="SET NULL")
    )
    cashier_id: Mapped[Optional[UUID]] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL")
    )
    payment_method: Mapped[str] = mapped_column(String(20), nullable=False)
    payment_status: Mapped[Optional[str]] = mapped_column(String(20), default="pending")
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    discount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), default=0)
    tax: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    paid_amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    change_amount: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    status: Mapped[Optional[str]] = mapped_column(String(20), default="completed")
    created_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    store = relationship("Store", back_populates="sales")
    customer = relationship("Customer", back_populates="sales")
    cashier = relationship("User")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
