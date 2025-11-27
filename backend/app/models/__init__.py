"""
SQLAlchemy models package.

Individual model modules (user, customer, product, sale, sale_item, setting, tenant)
will be added as they are implemented.
"""

# Import Base from the existing base_class module
from app.db.base_class import Base

# Import all models to ensure they are registered with Base
from app.models.tenant import Tenant
from app.models.user import User
from app.models.store import Store
from app.models.customer import Customer
from app.models.product import Product
from app.models.sale import Sale
from app.models.sale_item import SaleItem
from app.models.setting import Setting
from app.models.razorpay_connection import RazorpayConnection
from app.models.razorpay_payment import RazorpayPayment

__all__ = [
    "Base",
    "Tenant",
    "User",
    "Store",
    "Customer",
    "Product",
    "Sale",
    "SaleItem",
    "Setting",
    "RazorpayConnection",
    "RazorpayPayment"
]
