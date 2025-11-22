"""
Import all models here so SQLAlchemy/Alembic can discover metadata.
"""

from app.db.base_class import Base  # noqa: F401
from app.models.customer import Customer  # noqa: F401
from app.models.product import Product  # noqa: F401
from app.models.sale import Sale  # noqa: F401
from app.models.sale_item import SaleItem  # noqa: F401
from app.models.setting import Setting  # noqa: F401
from app.models.user import User  # noqa: F401
