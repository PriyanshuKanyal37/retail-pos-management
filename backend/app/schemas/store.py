from typing import Optional
from pydantic import BaseModel, EmailStr
from datetime import datetime
import uuid


class StoreBase(BaseModel):
    name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    status: str = "active"


class StoreCreate(StoreBase):
    pass


class StoreUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    status: Optional[str] = None


class StoreInDBBase(StoreBase):
    id: uuid.UUID
    tenant_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Store(StoreInDBBase):
    pass


class StoreWithManager(Store):
    manager_name: Optional[str] = None
    manager_email: Optional[str] = None
    product_count: Optional[int] = 0
    total_sales: Optional[int] = 0


class StoreStats(BaseModel):
    store_id: uuid.UUID
    store_name: str
    total_sales: int
    total_revenue: float
    product_count: int
    user_count: int
    today_sales: int
    today_revenue: float


class StoreList(BaseModel):
    items: list[StoreWithManager]
    total: int
    page: int
    size: int
    pages: int