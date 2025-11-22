from datetime import datetime
from decimal import Decimal
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, validator

from app.schemas.sale_item import SaleItemCreate, SaleItemResponse


class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"
    UPI = "upi"


class DiscountType(str, Enum):
    FLAT = "flat"
    PERCENTAGE = "percentage"


class SaleStatus(str, Enum):
    COMPLETED = "completed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class UPIStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"
    NA = "n/a"


class SaleBase(BaseModel):
    invoice_no: str = Field(..., min_length=5, max_length=30, description="Invoice number")
    customer_id: UUID | None = Field(None, description="Customer UUID (optional)")
    store_id: UUID | None = Field(None, description="Store UUID")
    payment_method: PaymentMethod = Field(..., description="Payment method used")
    subtotal: Decimal = Field(..., ge=0, description="Subtotal amount")
    discount: Decimal = Field(Decimal("0"), ge=0, description="Discount amount")
    discount_type: DiscountType = Field(DiscountType.FLAT, description="Type of discount")
    discount_value_input: Decimal = Field(Decimal("0"), ge=0, description="Original discount input value")
    tax: Decimal = Field(Decimal("0"), ge=0, description="Tax amount")
    total: Decimal = Field(..., ge=0, description="Total amount payable")
    paid_amount: Decimal = Field(..., ge=0, description="Amount paid")
    change_amount: Decimal | None = Field(None, ge=0, description="Change amount for cash payments")
    upi_status: UPIStatus = Field(UPIStatus.NA, description="UPI payment status")
    invoice_pdf_url: str | None = Field(None, description="URL to invoice PDF")
    status: SaleStatus = Field(SaleStatus.COMPLETED, description="Sale status")

    @validator('total')
    def validate_total(cls, v, values):
        if 'subtotal' in values:
            subtotal = values['subtotal']
            if v < subtotal:
                raise ValueError('Total cannot be less than subtotal')
        return v

    @validator('paid_amount')
    def validate_paid_amount(cls, v, values):
        if 'total' in values:
            total = values['total']
            if v < total:
                raise ValueError('Paid amount cannot be less than total')
        return v

    @validator('discount')
    def validate_discount(cls, v, values):
        if 'discount_type' in values and values['discount_type'] == DiscountType.PERCENTAGE:
            if v > 100:
                raise ValueError('Percentage discount cannot exceed 100%')
        return v


class SaleCreate(SaleBase):
    cashier_id: UUID | None = None
    items: list[SaleItemCreate]


class SaleUpdate(BaseModel):
    invoice_no: str | None = Field(None, min_length=5, max_length=30)
    customer_id: UUID | None = None
    payment_method: PaymentMethod | None = None
    subtotal: Decimal | None = Field(None, ge=0)
    discount: Decimal | None = Field(None, ge=0)
    discount_type: DiscountType | None = None
    discount_value_input: Decimal | None = Field(None, ge=0)
    tax: Decimal | None = Field(None, ge=0)
    total: Decimal | None = Field(None, ge=0)
    paid_amount: Decimal | None = Field(None, ge=0)
    change_amount: Decimal | None = Field(None, ge=0)
    upi_status: UPIStatus | None = None
    invoice_pdf_url: str | None = None
    status: SaleStatus | None = None


class SaleResponse(SaleBase):
    id: UUID
    cashier_id: UUID | None = None
    created_at: datetime
    items: list[SaleItemResponse] = []

    class Config:
        from_attributes = True


class PaymentBreakdown(BaseModel):
    method: str
    total: Decimal


class TopProduct(BaseModel):
    product_id: UUID | None = None
    product_name: str | None = None
    quantity: int
    revenue: Decimal


class SaleSummaryResponse(BaseModel):
    total_sales: int
    total_revenue: Decimal
    total_discount: Decimal
    average_order_value: Decimal
    payment_breakdown: list[PaymentBreakdown]
    top_products: list[TopProduct]
