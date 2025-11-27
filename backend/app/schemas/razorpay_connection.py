from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, validator


class RazorpayConnectionCreateRequest(BaseModel):
    key_id: str = Field(..., min_length=10, max_length=255, alias="key_id")
    key_secret: str = Field(..., min_length=10, max_length=255, alias="key_secret")
    mode: Literal["test", "live"] = Field("test", description="Razorpay environment mode")

    class Config:
        populate_by_name = True

    @validator("key_id", "key_secret")
    def strip_values(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Value cannot be empty")
        return stripped


class RazorpayConnectionUpdateRequest(BaseModel):
    mode: Literal["test", "live"] | None = None
    is_active: bool | None = None
    replaced_at: datetime | None = None


class RazorpayConnectionResponse(BaseModel):
    id: UUID
    tenant_id: UUID
    store_id: UUID
    manager_id: UUID | None = None
    razorpay_key_id: str
    mode: str
    is_active: bool
    connected_at: datetime
    updated_at: datetime
    replaced_at: datetime | None = None

    class Config:
        from_attributes = True


class RazorpayConnectionStatus(BaseModel):
    is_connected: bool
    mode: str | None = None
    connected_at: datetime | None = None
    updated_at: datetime | None = None
    key_id_last4: str | None = None
