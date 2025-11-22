from typing import Sequence
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate


class DuplicatePhoneError(Exception):
    """Raised when a customer phone already exists."""


async def list_customers(session: AsyncSession, *, tenant_id: UUID) -> Sequence[Customer]:
    result = await session.execute(
        select(Customer)
        .where(Customer.tenant_id == tenant_id)
        .order_by(Customer.created_at.desc())
    )
    return result.scalars().all()


async def get_customer(session: AsyncSession, customer_id: UUID, *, tenant_id: UUID) -> Customer | None:
    result = await session.execute(
        select(Customer).where(
            and_(Customer.id == customer_id, Customer.tenant_id == tenant_id)
        )
    )
    return result.scalar_one_or_none()


async def create_customer(
    session: AsyncSession,
    payload: CustomerCreate,
    *,
    tenant_id: UUID,
    store_id: UUID,
) -> Customer:
    customer = Customer(
        name=payload.name,
        phone=payload.phone,
        tenant_id=tenant_id,
        store_id=store_id,
    )
    session.add(customer)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise DuplicatePhoneError from exc
    await session.refresh(customer)
    return customer


async def update_customer(
    session: AsyncSession, customer_id: UUID, payload: CustomerUpdate, *, tenant_id: UUID
) -> Customer | None:
    customer = await get_customer(session, customer_id, tenant_id=tenant_id)
    if not customer:
        return None

    if payload.name is not None:
        customer.name = payload.name
    if payload.phone is not None:
        customer.phone = payload.phone

    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise DuplicatePhoneError from exc
    await session.refresh(customer)
    return customer
