from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from uuid import UUID, uuid4

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.store import Store
    from app.models.razorpay_connection import RazorpayConnection
    from app.models.razorpay_payment import RazorpayPayment


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    domain: Mapped[Optional[str]] = mapped_column(String(150), unique=True)
    status: Mapped[str] = mapped_column(String(20), server_default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default="now()")

    # Relationships
    users: Mapped[List["User"]] = relationship(
        "User",
        back_populates="tenant",
    )

    stores: Mapped[List["Store"]] = relationship(
        "Store",
        back_populates="tenant",
        cascade="all, delete-orphan",
    )

    razorpay_connections: Mapped[List["RazorpayConnection"]] = relationship(
        "RazorpayConnection",
        back_populates="tenant",
        cascade="all, delete-orphan",
    )

    razorpay_payments: Mapped[List["RazorpayPayment"]] = relationship(
        "RazorpayPayment",
        back_populates="tenant",
        cascade="all, delete-orphan",
    )
