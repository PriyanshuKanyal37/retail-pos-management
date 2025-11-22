"""
Custom exceptions for the FA POS application.
"""

from typing import Any, Dict, Optional


class FAPOSException(Exception):
    """Base exception for FA POS application."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class AuthenticationError(FAPOSException):
    """Authentication related errors."""

    def __init__(self, message: str = "Authentication failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=401, details=details)


class AuthorizationError(FAPOSException):
    """Authorization related errors."""

    def __init__(self, message: str = "Access denied", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=403, details=details)


class ValidationError(FAPOSException):
    """Validation related errors."""

    def __init__(self, message: str = "Validation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=422, details=details)


class NotFoundError(FAPOSException):
    """Resource not found errors."""

    def __init__(self, message: str = "Resource not found", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=404, details=details)


class ConflictError(FAPOSException):
    """Resource conflict errors."""

    def __init__(self, message: str = "Resource conflict", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=409, details=details)


class DatabaseError(FAPOSException):
    """Database related errors."""

    def __init__(self, message: str = "Database operation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=500, details=details)


class TenantError(FAPOSException):
    """Tenant related errors."""

    def __init__(self, message: str = "Tenant operation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=400, details=details)


class UserError(FAPOSException):
    """User related errors."""

    def __init__(self, message: str = "User operation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=400, details=details)


class CustomerError(FAPOSException):
    """Customer related errors."""

    def __init__(self, message: str = "Customer operation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=400, details=details)


class ProductError(FAPOSException):
    """Product related errors."""

    def __init__(self, message: str = "Product operation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=400, details=details)


class SaleError(FAPOSException):
    """Sale related errors."""

    def __init__(self, message: str = "Sale operation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=400, details=details)


class InventoryError(FAPOSException):
    """Inventory related errors."""

    def __init__(self, message: str = "Inventory operation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=400, details=details)


class SettingsError(FAPOSException):
    """Settings related errors."""

    def __init__(self, message: str = "Settings operation failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=400, details=details)


class ExternalServiceError(FAPOSException):
    """External service integration errors."""

    def __init__(self, message: str = "External service error", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=502, details=details)


class RateLimitError(FAPOSException):
    """Rate limiting errors."""

    def __init__(self, message: str = "Rate limit exceeded", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=429, details=details)


class FileUploadError(FAPOSException):
    """File upload related errors."""

    def __init__(self, message: str = "File upload failed", details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=400, details=details)


# Specific validation errors
class DuplicateEmailError(UserError):
    """Email already exists error."""

    def __init__(self, email: str):
        super().__init__(f"Email '{email}' already exists", {"email": email})


class DuplicatePhoneError(CustomerError):
    """Phone number already exists error."""

    def __init__(self, phone: str):
        super().__init__(f"Phone number '{phone}' already exists", {"phone": phone})


class DuplicateSKUError(ProductError):
    """SKU already exists error."""

    def __init__(self, sku: str):
        super().__init__(f"SKU '{sku}' already exists", {"sku": sku})


class DuplicateBarcodeError(ProductError):
    """Barcode already exists error."""

    def __init__(self, barcode: str):
        super().__init__(f"Barcode '{barcode}' already exists", {"barcode": barcode})


class InsufficientStockError(InventoryError):
    """Insufficient stock error."""

    def __init__(self, product_name: str, requested: int, available: int):
        super().__init__(
            f"Insufficient stock for product '{product_name}'. Requested: {requested}, Available: {available}",
            {"product_name": product_name, "requested": requested, "available": available}
        )


class InvalidPaymentError(SaleError):
    """Invalid payment error."""

    def __init__(self, message: str = "Invalid payment details"):
        super().__init__(message)


class PaymentProcessingError(SaleError):
    """Payment processing error."""

    def __init__(self, message: str = "Payment processing failed"):
        super().__init__(message)


# Tenant specific errors
class TenantNotFoundError(TenantError):
    """Tenant not found error."""

    def __init__(self, tenant_id: str):
        super().__init__(f"Tenant '{tenant_id}' not found", {"tenant_id": tenant_id})


class TenantInactiveError(TenantError):
    """Tenant inactive error."""

    def __init__(self, tenant_id: str):
        super().__init__(f"Tenant '{tenant_id}' is inactive", {"tenant_id": tenant_id})


# User specific errors
class UserNotFoundError(UserError):
    """User not found error."""

    def __init__(self, user_id: str):
        super().__init__(f"User '{user_id}' not found", {"user_id": user_id})


class UserInactiveError(UserError):
    """User inactive error."""

    def __init__(self, user_id: str):
        super().__init__(f"User '{user_id}' is inactive", {"user_id": user_id})


class InvalidCredentialsError(AuthenticationError):
    """Invalid credentials error."""

    def __init__(self):
        super().__init__("Invalid email or password")


# Product specific errors
class ProductNotFoundError(ProductError):
    """Product not found error."""

    def __init__(self, product_id: str):
        super().__init__(f"Product '{product_id}' not found", {"product_id": product_id})


class ProductInactiveError(ProductError):
    """Product inactive error."""

    def __init__(self, product_id: str):
        super().__init__(f"Product '{product_id}' is inactive", {"product_id": product_id})


# Customer specific errors
class CustomerNotFoundError(CustomerError):
    """Customer not found error."""

    def __init__(self, customer_id: str):
        super().__init__(f"Customer '{customer_id}' not found", {"customer_id": customer_id})


# Sale specific errors
class SaleNotFoundError(SaleError):
    """Sale not found error."""

    def __init__(self, sale_id: str):
        super().__init__(f"Sale '{sale_id}' not found", {"sale_id": sale_id})


class SaleAlreadyCompletedError(SaleError):
    """Sale already completed error."""

    def __init__(self, sale_id: str):
        super().__init__(f"Sale '{sale_id}' is already completed", {"sale_id": sale_id})


# Business logic errors
class BusinessLogicError(FAPOSException):
    """Business logic violation errors."""

    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message, status_code=400, details=details)


class InvalidTransitionError(BusinessLogicError):
    """Invalid state transition error."""

    def __init__(self, current_state: str, target_state: str):
        super().__init__(
            f"Invalid transition from '{current_state}' to '{target_state}'",
            {"current_state": current_state, "target_state": target_state}
        )