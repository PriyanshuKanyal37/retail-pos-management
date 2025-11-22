from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class SettingBase(BaseModel):
    store_name: str = Field(..., max_length=150)
    store_address: str | None = None
    store_phone: str | None = None
    store_email: str | None = None
    tax_rate: float | None = None
    currency_symbol: str | None = None
    currency_code: str | None = None
    upi_id: str | None = None
    store_logo_url: str | None = None
    low_stock_threshold: int | None = None
    theme: str | None = "light"


class SettingUpdate(SettingBase):
    pass


class SettingResponse(SettingBase):
    id: UUID
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
