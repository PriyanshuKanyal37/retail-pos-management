from datetime import datetime
from typing import Optional, TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.store import Store


class Setting(Base):
    __tablename__ = "settings"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    store_id: Mapped[Optional[UUID]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("stores.id"), nullable=True)
    store_name: Mapped[str] = mapped_column(String(150), nullable=False)
    store_address: Mapped[Optional[str]] = mapped_column(Text)
    store_phone: Mapped[Optional[str]] = mapped_column(String(20))
    store_email: Mapped[Optional[str]] = mapped_column(String(100))
    tax_rate: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), server_default="0")
    currency_symbol: Mapped[Optional[str]] = mapped_column(String(5), server_default="Rs.")
    currency_code: Mapped[Optional[str]] = mapped_column(String(10), server_default="INR")
    upi_id: Mapped[Optional[str]] = mapped_column(String(100))
    store_logo_url: Mapped[Optional[str]] = mapped_column(Text)
    low_stock_threshold: Mapped[Optional[int]] = mapped_column(Integer, server_default="5")
    theme: Mapped[Optional[str]] = mapped_column(String(20), server_default="light")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    store = relationship("Store", back_populates="settings")
