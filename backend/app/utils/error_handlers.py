import functools
import logging
from typing import Callable, Any

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError, DatabaseError

logger = logging.getLogger(__name__)


def handle_service_errors(func: Callable) -> Callable:
    """
    Decorator to handle service layer errors and convert them to HTTP exceptions.

    This decorator catches service-specific exceptions and converts them
    to appropriate HTTP responses with proper status codes.
    """
    @functools.wraps(func)
    async def wrapper(*args, **kwargs) -> Any:
        try:
            return await func(*args, **kwargs)
        except HTTPException:
            # Re-raise HTTP exceptions as-is (already properly formatted)
            raise
        except IntegrityError as exc:
            logger.error(f"Database integrity error in {func.__name__}: {str(exc)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data integrity violation. Please check your input."
            ) from exc
        except DatabaseError as exc:
            logger.error(f"Database error in {func.__name__}: {str(exc)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Database operation failed. Please try again later."
            ) from exc
        except ValueError as exc:
            logger.error(f"Validation error in {func.__name__}: {str(exc)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(exc)
            ) from exc
        except Exception as exc:
            logger.error(f"Unexpected error in {func.__name__}: {str(exc)}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred. Please try again later."
            ) from exc

    return wrapper


class APIError(Exception):
    """
    Base class for custom API errors.

    This allows creating specific error types that can be caught
    and converted to appropriate HTTP responses.
    """

    def __init__(self, message: str, status_code: int = 500, error_code: str = "API_ERROR"):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        super().__init__(self.message)


class ValidationError(APIError):
    """Raised when request validation fails."""

    def __init__(self, message: str, field: str = None):
        self.field = field
        super().__init__(message, 400, "VALIDATION_ERROR")


class NotFoundError(APIError):
    """Raised when a resource is not found."""

    def __init__(self, resource: str, identifier: str = None):
        message = f"{resource} not found"
        if identifier:
            message += f" with identifier: {identifier}"
        super().__init__(message, 404, "NOT_FOUND")
        self.resource = resource
        self.identifier = identifier


class ConflictError(APIError):
    """Raised when a conflict with existing data occurs."""

    def __init__(self, message: str, conflict_field: str = None):
        self.conflict_field = conflict_field
        super().__init__(message, 409, "CONFLICT")


class UnauthorizedError(APIError):
    """Raised when authentication fails."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(message, 401, "UNAUTHORIZED")


class ForbiddenError(APIError):
    """Raised when user lacks permission for an operation."""

    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(message, 403, "FORBIDDEN")


class RateLimitError(APIError):
    """Raised when rate limit is exceeded."""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = None):
        self.retry_after = retry_after
        super().__init__(message, 429, "RATE_LIMIT_EXCEEDED")


def api_error_handler(exc: APIError) -> HTTPException:
    """
    Convert APIError to HTTPException.

    Args:
        exc: APIError instance

    Returns:
        HTTPException with appropriate status code and error details
    """
    return HTTPException(
        status_code=exc.status_code,
        detail={
            "error": exc.error_code,
            "message": exc.message,
            **({"field": exc.field} if hasattr(exc, "field") and exc.field else {})
        }
    )


def create_error_response(error_code: str, message: str, details: dict = None) -> dict:
    """
    Create a standardized error response.

    Args:
        error_code: Machine-readable error code
        message: Human-readable error message
        details: Additional error details (optional)

    Returns:
        Dictionary with error information
    """
    error_response = {
        "error": error_code,
        "message": message,
    }

    if details:
        error_response["details"] = details

    return error_response


def log_error(
    func_name: str,
    error: Exception,
    user_id: str = None,
    tenant_id: str = None,
    additional_info: dict = None
) -> None:
    """
    Log error with standardized format.

    Args:
        func_name: Name of the function where error occurred
        error: Exception instance
        user_id: User ID (optional)
        tenant_id: Tenant ID (optional)
        additional_info: Additional context information (optional)
    """
    error_data = {
        "function": func_name,
        "error_type": type(error).__name__,
        "error_message": str(error),
    }

    if user_id:
        error_data["user_id"] = user_id

    if tenant_id:
        error_data["tenant_id"] = tenant_id

    if additional_info:
        error_data["additional_info"] = additional_info

    logger.error(
        f"Error in {func_name}",
        extra=error_data,
        exc_info=True
    )