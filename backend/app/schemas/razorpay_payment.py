from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class RazorpayOrderRequest(BaseModel):
    sale_id: UUID
    amount_override_paise: int | None = Field(None, gt=0)
    receipt: str | None = Field(None, max_length=255)


class RazorpayOrderCreate(BaseModel):
    tenant_id: UUID
    store_id: UUID
    sale_id: UUID
    razorpay_order_id: str
    amount_paise: int = Field(..., gt=0)
    currency: str = Field("INR", max_length=10)
    receipt: str | None = Field(None, max_length=255)
    status: str = "created"
    attempts: int = 0


class RazorpayPaymentUpdate(BaseModel):
    status: str | None = None
    razorpay_payment_id: str | None = None
    razorpay_signature: str | None = None
    error_code: str | None = None
    error_description: str | None = None
    attempts: int | None = None
    captured_at: datetime | None = None


class RazorpayPaymentResponse(BaseModel):
    id: UUID
    sale_id: UUID
    store_id: UUID
    tenant_id: UUID
    razorpay_order_id: str
    razorpay_payment_id: str | None
    status: str
    amount_paise: int
    currency: str
    receipt: str | None
    attempts: int
    error_code: str | None = None
    error_description: str | None = None
    created_at: datetime
    updated_at: datetime
    captured_at: datetime | None

    class Config:
        from_attributes = True


class RazorpayPaymentStatusResponse(BaseModel):
    sale_id: UUID
    status: str
    amount_paise: int
    currency: str
    razorpay_order_id: str
    razorpay_payment_id: str | None
    captured_at: datetime | None
    updated_at: datetime


class RazorpayOrderResponse(BaseModel):
    sale_id: UUID
    order_id: str
    amount: int
    currency: str
    key_id: str
    receipt: str | None = None
