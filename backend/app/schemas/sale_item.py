from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class SaleItemBase(BaseModel):
    product_id: UUID | None = None
    quantity: int
    unit_price: Decimal
    total: Decimal | None = None
    store_id: UUID | None = None


class SaleItemCreate(SaleItemBase):
    product_id: UUID


class SaleItemUpdate(BaseModel):
    product_id: UUID | None = None
    quantity: int | None = None
    unit_price: Decimal | None = None
    total: Decimal | None = None


class SaleItemResponse(SaleItemBase):
    id: UUID
    sale_id: UUID

    class Config:
        from_attributes = True
