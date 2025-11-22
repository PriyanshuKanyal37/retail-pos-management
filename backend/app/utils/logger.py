"""
Production-ready logging system for FA POS Backend
Provides structured logging with security event tracking
"""

import logging
import sys
import json
import time
from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID
from contextlib import contextmanager
from functools import wraps

# Configure structured JSON logging for production
class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logs"""

    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat(),
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }

        # Add extra fields if present
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = record.user_id
        if hasattr(record, 'session_id'):
            log_entry['session_id'] = record.session_id
        if hasattr(record, 'ip_address'):
            log_entry['ip_address'] = record.ip_address
        if hasattr(record, 'request_id'):
            log_entry['request_id'] = record.request_id
        if hasattr(record, 'action'):
            log_entry['action'] = record.action
        if hasattr(record, 'resource'):
            log_entry['resource'] = record.resource
        if hasattr(record, 'status'):
            log_entry['status'] = record.status

        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)

        return json.dumps(log_entry, default=str)


class SecurityLogger:
    """Specialized logger for security events"""

    def __init__(self):
        self.logger = logging.getLogger('security')

    def log_login_attempt(self, email: str, success: bool, ip_address: str, user_id: Optional[UUID] = None):
        """Log login attempt"""
        self.logger.info(
            "Login attempt",
            extra={
                'action': 'login_attempt',
                'email': email,
                'status': 'success' if success else 'failed',
                'ip_address': ip_address,
                'user_id': str(user_id) if user_id else None
            }
        )

    def log_failed_login(self, email: str, reason: str, ip_address: str):
        """Log failed login with specific reason"""
        self.logger.warning(
            f"Failed login attempt: {reason}",
            extra={
                'action': 'login_failed',
                'email': email,
                'reason': reason,
                'ip_address': ip_address,
                'status': 'security_event'
            }
        )

    def log_suspicious_activity(self, activity: str, details: Dict[str, Any], ip_address: str, user_id: Optional[UUID] = None):
        """Log suspicious activity"""
        self.logger.warning(
            f"Suspicious activity: {activity}",
            extra={
                'action': 'suspicious_activity',
                'activity': activity,
                'details': details,
                'ip_address': ip_address,
                'user_id': str(user_id) if user_id else None,
                'status': 'security_alert'
            }
        )

    def log_privileged_action(self, action: str, resource: str, user_id: UUID, ip_address: str):
        """Log privileged/admin actions"""
        self.logger.info(
            f"Privileged action: {action} on {resource}",
            extra={
                'action': 'privileged_action',
                'privilege_action': action,
                'resource': resource,
                'user_id': str(user_id),
                'ip_address': ip_address,
                'status': 'admin_action'
            }
        )

    def log_data_access(self, resource: str, user_id: UUID, ip_address: str, success: bool = True):
        """Log data access events"""
        self.logger.info(
            f"Data access: {resource}",
            extra={
                'action': 'data_access',
                'resource': resource,
                'user_id': str(user_id),
                'ip_address': ip_address,
                'status': 'success' if success else 'failed'
            }
        )


class AuditLogger:
    """Logger for business audit events"""

    def __init__(self):
        self.logger = logging.getLogger('audit')

    def log_sale_creation(self, sale_id: UUID, user_id: UUID, total: float, customer_id: Optional[UUID] = None):
        """Log sale creation for audit"""
        self.logger.info(
            f"Sale created: {sale_id}",
            extra={
                'action': 'sale_created',
                'sale_id': str(sale_id),
                'user_id': str(user_id),
                'customer_id': str(customer_id) if customer_id else None,
                'total': total,
                'status': 'business_event'
            }
        )

    def log_inventory_change(self, product_id: UUID, old_stock: int, new_stock: int, user_id: UUID, reason: str):
        """Log inventory changes"""
        self.logger.info(
            f"Inventory changed for product {product_id}",
            extra={
                'action': 'inventory_change',
                'product_id': str(product_id),
                'old_stock': old_stock,
                'new_stock': new_stock,
                'difference': new_stock - old_stock,
                'user_id': str(user_id),
                'reason': reason,
                'status': 'business_event'
            }
        )

    def log_user_action(self, action: str, target_user_id: UUID, performed_by: UUID, ip_address: str):
        """Log user management actions"""
        self.logger.info(
            f"User management action: {action}",
            extra={
                'action': 'user_management',
                'management_action': action,
                'target_user_id': str(target_user_id),
                'performed_by': str(performed_by),
                'ip_address': ip_address,
                'status': 'admin_event'
            }
        )


def setup_logging():
    """Configure logging for the application"""

    # Root logger configuration
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Console handler for development
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)

    # File handler for production (Windows compatible)
    import os
    log_dir = os.path.join(os.getcwd(), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    file_handler = logging.FileHandler(os.path.join(log_dir, 'app.log'))
    file_handler.setLevel(logging.INFO)

    # Use different formatters for development vs production
    if logging.getLogger().level == logging.DEBUG:
        # Development: readable format
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
    else:
        # Production: structured JSON
        formatter = StructuredFormatter()

    console_handler.setFormatter(formatter)
    file_handler.setFormatter(formatter)

    # Add handlers
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)

    # Suppress noisy loggers
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy.pool').setLevel(logging.WARNING)
    logging.getLogger('httpx').setLevel(logging.WARNING)


def log_execution_time(logger: logging.Logger, operation: str):
    """Decorator to log execution time of functions"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                execution_time = time.time() - start_time

                logger.info(
                    f"Operation completed: {operation}",
                    extra={
                        'action': 'performance_metric',
                        'operation': operation,
                        'execution_time': execution_time,
                        'status': 'completed'
                    }
                )
                return result
            except Exception as e:
                execution_time = time.time() - start_time

                logger.error(
                    f"Operation failed: {operation}",
                    extra={
                        'action': 'performance_metric',
                        'operation': operation,
                        'execution_time': execution_time,
                        'error': str(e),
                        'status': 'failed'
                    }
                )
                raise
        return wrapper
    return decorator


@contextmanager
def log_request_context(logger: logging.Logger, request_id: str, user_id: Optional[UUID] = None, ip_address: Optional[str] = None):
    """Context manager for request logging"""
    start_time = time.time()

    logger.info(
        f"Request started: {request_id}",
        extra={
            'action': 'request_start',
            'request_id': request_id,
            'user_id': str(user_id) if user_id else None,
            'ip_address': ip_address
        }
    )

    try:
        yield
        execution_time = time.time() - start_time

        logger.info(
            f"Request completed: {request_id}",
            extra={
                'action': 'request_complete',
                'request_id': request_id,
                'execution_time': execution_time,
                'status': 'success'
            }
        )
    except Exception as e:
        execution_time = time.time() - start_time

        logger.error(
            f"Request failed: {request_id}",
            extra={
                'action': 'request_failed',
                'request_id': request_id,
                'execution_time': execution_time,
                'error': str(e),
                'status': 'error'
            }
        )
        raise


# Create singleton instances
security_logger = SecurityLogger()
audit_logger = AuditLogger()

# Export main components
__all__ = [
    'setup_logging',
    'security_logger',
    'audit_logger',
    'log_execution_time',
    'log_request_context',
    'StructuredFormatter'
]