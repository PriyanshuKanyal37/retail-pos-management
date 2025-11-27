"""Pydantic schemas package."""

from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserRole,
    UserStatus
)

from app.schemas.tenant import (
    TenantBase,
    TenantCreate,
    TenantUpdate,
    TenantResponse,
    LoginRequest,
    LoginResponse,
    UserInfo,
    TenantUserCreate,
    TenantUserResponse,
    UserResponse as TenantUserSchema,
    TenantStatisticsResponse
)

from app.schemas.customer import (
    CustomerBase,
    CustomerCreate,
    CustomerUpdate,
    CustomerResponse
)

from app.schemas.product import (
    ProductBase,
    ProductCreate,
    ProductUpdate,
    ProductResponse
)

from app.schemas.sale import (
    SaleBase,
    SaleCreate,
    SaleResponse,
    PaymentMethod,
    DiscountType,
    SaleStatus,
    UPIStatus,
    PaymentBreakdown,
    TopProduct,
    SaleSummaryResponse
)

from app.schemas.sale_item import (
    SaleItemBase,
    SaleItemCreate,
    SaleItemResponse
)

from app.schemas.setting import (
    SettingBase,
    SettingUpdate,
    SettingResponse
)

from app.schemas.razorpay_connection import (
    RazorpayConnectionCreateRequest,
    RazorpayConnectionUpdateRequest,
    RazorpayConnectionResponse,
    RazorpayConnectionStatus
)

from app.schemas.razorpay_payment import (
    RazorpayOrderRequest,
    RazorpayOrderCreate,
    RazorpayPaymentUpdate,
    RazorpayPaymentResponse,
    RazorpayPaymentStatusResponse,
    RazorpayOrderResponse,
)

__all__ = [
    # User schemas
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserRole",
    "UserStatus",

    # Tenant schemas
    "TenantBase",
    "TenantCreate",
    "TenantUpdate",
    "TenantResponse",
    "LoginRequest",
    "LoginResponse",
    "UserInfo",
    "TenantUserCreate",
    "TenantUserResponse",
    "TenantUserSchema",
    "TenantStatisticsResponse",

    # Customer schemas
    "CustomerBase",
    "CustomerCreate",
    "CustomerUpdate",
    "CustomerResponse",

    # Product schemas
    "ProductBase",
    "ProductCreate",
    "ProductUpdate",
    "ProductResponse",

    # Sale schemas
    "SaleBase",
    "SaleCreate",
    "SaleResponse",
    "PaymentMethod",
    "DiscountType",
    "SaleStatus",
    "UPIStatus",
    "PaymentBreakdown",
    "TopProduct",
    "SaleSummaryResponse",

    # Sale item schemas
    "SaleItemBase",
    "SaleItemCreate",
    "SaleItemResponse",

    # Setting schemas
    "SettingBase",
    "SettingUpdate",
    "SettingResponse",

    # Razorpay connection schemas
    "RazorpayConnectionCreateRequest",
    "RazorpayConnectionUpdateRequest",
    "RazorpayConnectionResponse",
    "RazorpayConnectionStatus",

    # Razorpay payment schemas
    "RazorpayOrderRequest",
    "RazorpayOrderCreate",
    "RazorpayPaymentUpdate",
    "RazorpayPaymentResponse",
    "RazorpayPaymentStatusResponse",
    "RazorpayOrderResponse",
]
