from datetime import datetime
from uuid import UUID
import re

from pydantic import BaseModel, Field, validator


class CustomerBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Customer's full name")
    phone: str = Field(..., min_length=10, max_length=10, description="10-digit phone number")

    @validator('name')
    def validate_name(cls, v):
        if not v or not v.strip():
            raise ValueError('Name cannot be empty')

        # Remove extra whitespace
        v = ' '.join(v.split())

        # Allow letters, spaces, hyphens, and apostrophes
        if not re.match(r'^[a-zA-Z\s\-\'\.]+$', v):
            raise ValueError('Name can only contain letters, spaces, hyphens, and apostrophes')

        return v.strip()

    @validator('phone')
    def validate_phone(cls, v):
        if not v:
            raise ValueError('Phone number is required')

        # Remove any non-digit characters
        v = re.sub(r'\D', '', v)

        # Validate Indian mobile number format
        if not re.match(r'^[6-9]\d{9}$', v):
            raise ValueError('Please enter a valid 10-digit Indian mobile number')

        return v


class CustomerCreate(CustomerBase):
    store_id: UUID | None = None


class CustomerUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    phone: str | None = Field(None, max_length=20, min_length=5)


class CustomerResponse(BaseModel):
    id: UUID
    store_id: UUID
    name: str
    phone: str
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
