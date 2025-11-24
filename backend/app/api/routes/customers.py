from typing import Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db_session, get_tenant_id
from app.models.user import User
from app.schemas.customer import CustomerCreate, CustomerResponse, CustomerUpdate
from app.services.customers import (
    DuplicatePhoneError,
    create_customer,
    list_customers,
    update_customer,
)

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/", response_model=list[CustomerResponse])
def get_customers(
    _: User = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    session: Session = Depends(get_db_session),
) -> Sequence[CustomerResponse]:
    return list_customers(session, tenant_id=tenant_id)


@router.post("/", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer_endpoint(
    payload: CustomerCreate,
    current_user: User = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    session: Session = Depends(get_db_session),
) -> CustomerResponse:
    store_id = payload.store_id or current_user.store_id
    if not store_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Store ID is required to create customers",
        )

    try:
        return create_customer(
            session,
            payload,
            tenant_id=tenant_id,
            store_id=store_id,
        )
    except DuplicatePhoneError:
        raise HTTPException(status_code=409, detail="Phone already exists")


@router.patch("/{customer_id}", response_model=CustomerResponse)
def update_customer_endpoint(
    customer_id: UUID,
    payload: CustomerUpdate,
    _: User = Depends(get_current_user),
    tenant_id: UUID = Depends(get_tenant_id),
    session: Session = Depends(get_db_session),
) -> CustomerResponse:
    try:
        customer = update_customer(session, customer_id, payload, tenant_id=tenant_id)
    except DuplicatePhoneError:
        raise HTTPException(status_code=409, detail="Phone already exists")
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer
