from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, validator


class TenantBase(BaseModel):
    """Base schema for tenant data."""

    name: str = Field(..., min_length=1, max_length=150, description="Tenant name")
    domain: Optional[str] = Field(None, max_length=150, description="Tenant domain")
    status: Optional[str] = Field("active", pattern="^(active|inactive|suspended)$", description="Tenant status")

    @validator('domain')
    def validate_domain(cls, v):
        if v is not None:
            return v.lower()
        return v

    @validator('name')
    def validate_name(cls, v):
        return v.strip()


class TenantCreate(TenantBase):
    """Schema for creating a new tenant."""
    pass


class TenantUpdate(BaseModel):
    """Schema for updating tenant information."""
    name: Optional[str] = Field(None, min_length=1, max_length=150)
    domain: Optional[str] = Field(None, max_length=150)
    status: Optional[str] = Field(None, pattern="^(active|inactive|suspended)$")

    @validator('name')
    def validate_name(cls, v):
        if v is not None:
            return v.strip()
        return v

    @validator('domain')
    def validate_domain(cls, v):
        if v is not None:
            return v.lower()
        return v


class TenantResponse(TenantBase):
    """Schema for tenant response data."""
    id: UUID = Field(..., description="Tenant unique identifier")
    created_at: datetime = Field(..., description="Tenant creation timestamp")

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    """Schema for creating a new user within a tenant."""
    email: EmailStr = Field(..., description="User email address")
    name: str = Field(..., min_length=1, max_length=100, description="User full name")
    password: str = Field(..., min_length=6, max_length=128, description="User password")
    role: str = Field(..., pattern="^(super_admin|manager|cashier)$", description="User role")

    @validator('email')
    def validate_email(cls, v):
        return v.lower().strip()

    @validator('name')
    def validate_name(cls, v):
        return v.strip()


class LoginRequest(BaseModel):
    """Schema for login request."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")
    tenant_domain: Optional[str] = Field(None, max_length=150, description="Tenant domain (optional)")

    @validator('email')
    def validate_email(cls, v):
        return v.lower().strip()

    @validator('tenant_domain')
    def validate_domain(cls, v):
        if v is not None:
            return v.lower().strip()
        return v


class UserInfo(BaseModel):
    """Schema for user information in login response."""
    id: str = Field(..., description="User unique identifier")
    email: str = Field(..., description="User email address")
    name: str = Field(..., description="User full name")
    role: str = Field(..., description="User role")
    tenant_id: str = Field(..., description="Tenant identifier")
    store_id: Optional[str] = Field(None, description="Store identifier")
    status: str = Field(..., description="User status")
    


class LoginResponse(BaseModel):
    """Schema for login response."""
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field("bearer", description="Token type")
    user: UserInfo = Field(..., description="User information")

    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                    "email": "admin@example.com",
                    "name": "Admin User",
                    "role": "admin",
                    "tenant_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                    "store_id": "3fa85f64-5717-4562-b3fc-2c963f66afa7",
                    "status": "active"
                }
            }
        }


class TenantUserCreate(BaseModel):
    """Schema for creating a user within a specific tenant."""
    tenant_id: UUID = Field(..., description="Tenant ID")
    user: UserCreate = Field(..., description="User creation data")


class TenantUserResponse(BaseModel):
    """Schema for tenant user response."""
    id: UUID = Field(..., description="User unique identifier")
    tenant_id: UUID = Field(..., description="Tenant identifier")
    name: str = Field(..., description="User full name")
    email: str = Field(..., description="User email address")
    role: str = Field(..., description="User role")
    status: str = Field(..., description="User status")
    created_at: datetime = Field(..., description="User creation timestamp")

    class Config:
        from_attributes = True


class UserResponse(BaseModel):
    """Schema for user response (backward compatibility)."""
    id: UUID = Field(..., description="User unique identifier")
    tenant_id: UUID = Field(..., description="Tenant identifier")
    name: str = Field(..., description="User full name")
    email: EmailStr = Field(..., description="User email address")
    role: str = Field(..., description="User role")
    status: str = Field(..., description="User status")
    created_at: datetime = Field(..., description="User creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="User last update timestamp")

    class Config:
        from_attributes = True


class TenantStatisticsResponse(BaseModel):
    """Schema for tenant statistics response."""
    tenant_id: UUID = Field(..., description="Tenant identifier")
    tenant_name: str = Field(..., description="Tenant name")
    total_users: int = Field(..., description="Total number of users")
    total_products: int = Field(..., description="Total number of products")
    total_customers: int = Field(..., description="Total number of customers")
    total_sales: int = Field(..., description="Total number of sales")
    total_revenue: float = Field(..., description="Total revenue")
    active_users: int = Field(..., description="Number of active users")
    active_products: int = Field(..., description="Number of active products")

    class Config:
        from_attributes = False