from __future__ import annotations

from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from uuid import UUID as UUIDType, uuid4

from sqlalchemy import DateTime, ForeignKey, String, Text, func, Boolean
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.store import Store
    from app.models.tenant import Tenant


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUIDType] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    tenant_id: Mapped[UUIDType] = mapped_column(PGUUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # super_admin, manager, cashier
    is_global: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    store_id: Mapped[Optional[UUIDType]] = mapped_column(PGUUID(as_uuid=True), ForeignKey("stores.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="active")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tenant: Mapped["Tenant"] = relationship(
        "Tenant",
        back_populates="users",
    )

    # Store relationship
    store: Mapped[Optional["Store"]] = relationship(
        "Store",
        foreign_keys="User.store_id",
        back_populates="users",
    )

    # Relationship with sales where user is the cashier
    sales_as_cashier = relationship(
        "Sale",
        foreign_keys="Sale.cashier_id",
        back_populates="cashier",
    )
