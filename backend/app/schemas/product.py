from datetime import datetime
from decimal import Decimal
from uuid import UUID
from typing import Union, Optional

from pydantic import BaseModel, Field, field_validator


class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    sku: str = Field(..., min_length=1, max_length=50)
    barcode: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    price: Union[float, Decimal]  # Accept both JavaScript numbers and Decimal
    stock: int = 0
    low_stock_threshold: int = 5
    img_url: Optional[str] = None
    status: str = Field("active", pattern="^(active|inactive)$", max_length=20)  # Required with validation

    @field_validator('price', mode='before')
    @classmethod
    def validate_price(cls, v):
        """Convert price to Decimal if it's a number"""
        if isinstance(v, (int, float)):
            return Decimal(str(v))
        return Decimal(v) if v else Decimal('0')


class ProductCreate(ProductBase):
    store_id: UUID | None = None


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    sku: Optional[str] = Field(None, min_length=1, max_length=50)
    barcode: Optional[str] = Field(None, max_length=100)
    category: Optional[str] = Field(None, max_length=100)
    price: Optional[Union[float, Decimal]] = None
    stock: Optional[int] = None
    low_stock_threshold: Optional[int] = None
    img_url: Optional[str] = None
    status: Optional[str] = Field(None, pattern="^(active|inactive)$", max_length=20)

    @field_validator('price', mode='before')
    @classmethod
    def validate_price(cls, v):
        """Convert price to Decimal if it's a number"""
        if v is None:
            return v
        if isinstance(v, (int, float)):
            return Decimal(str(v))
        return Decimal(v)


class ProductResponse(BaseModel):
    id: UUID
    store_id: UUID | None = None
    tenant_id: UUID | None = None
    name: str
    sku: str
    barcode: str | None
    category: str | None
    price: Decimal
    stock: int
    low_stock_threshold: int | None = None
    img_url: str | None
    status: str
    owner_id: UUID | None = None
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
