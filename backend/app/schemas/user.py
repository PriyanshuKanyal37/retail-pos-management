from datetime import datetime
from uuid import UUID
from enum import Enum
import re

from pydantic import BaseModel, EmailStr, Field, validator


class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    MANAGER = "manager"
    CASHIER = "cashier"


class UserStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class UserBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="User's full name")
    email: EmailStr
    role: UserRole
    status: UserStatus | None = None
    store_id: UUID | None = None

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


class UserCreate(UserBase):
    tenant_id: UUID | None = None
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password must be at least 8 characters long"
    )

    @validator('password')
    def validate_password(cls, v):
        if not v:
            raise ValueError('Password is required')

        # Check for at least one uppercase letter
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')

        # Check for at least one lowercase letter
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')

        # Check for at least one digit
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one number')

        # Check for at least one special character
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')

        return v


class UserUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    role: str | None = None
    status: str | None = None
    store_id: UUID | None = None
    password: str | None = Field(None, min_length=6)


class UserResponse(BaseModel):
    id: UUID
    name: str
    email: EmailStr
    role: str
    status: str
    store_id: UUID | None = None
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True
