from typing import Optional, Sequence
from uuid import UUID

from sqlalchemy import and_, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate
from app.services.base import TenantAwareService


class ProductError(Exception):
    """Base class for product-related errors."""


class DuplicateSKUError(ProductError):
    """Raised when SKU already exists within tenant."""


class DuplicateBarcodeError(ProductError):
    """Raised when barcode already exists within tenant."""


class ProductNotFoundError(ProductError):
    """Raised when product is not found."""


class TenantProductService(TenantAwareService):
    """Tenant-aware product service that automatically filters by tenant_id"""

    def __init__(self, session: Session, tenant_id: UUID):
        super().__init__(session, tenant_id, Product)

    def get_by_sku(self, sku: str) -> Optional[Product]:
        """Get a product by SKU within the current tenant."""
        statement = select(Product).where(
            and_(
                self.get_tenant_filter(),
                Product.sku == sku
            )
        )
        result = self.session.execute(statement)
        return result.scalar_one_or_none()

    def get_by_barcode(self, barcode: str) -> Optional[Product]:
        """Get a product by barcode within the current tenant."""
        statement = select(Product).where(
            and_(
                self.get_tenant_filter(),
                Product.barcode == barcode
            )
        )
        result = self.session.execute(statement)
        return result.scalar_one_or_none()

    def get_low_stock_products(self, threshold: int = 5) -> Sequence[Product]:
        """Get products with stock below threshold within the current tenant."""
        statement = select(Product).where(
            and_(
                self.get_tenant_filter(),
                Product.stock <= threshold,
                Product.status == "active"
            )
        ).order_by(Product.stock.asc())

        result = self.session.execute(statement)
        return result.scalars().all()

    def create(self, data: dict) -> Product:
        """Create a new product with tenant validation."""
        # Check for duplicate SKU within tenant
        existing = self.get_by_sku(data.get('sku', ''))
        if existing:
            raise DuplicateSKUError(f"Product with SKU '{data.get('sku')}' already exists in this tenant")

        # Check for duplicate barcode within tenant if provided
        barcode = data.get('barcode')
        if barcode:
            existing = self.get_by_barcode(barcode)
            if existing:
                raise DuplicateBarcodeError(f"Product with barcode '{barcode}' already exists in this tenant")

        # Use parent class create method which automatically sets tenant_id
        try:
            return super().create(data)
        except IntegrityError as exc:
            self.session.rollback()
            error_str = str(exc).lower()
            if "sku" in error_str:
                raise DuplicateSKUError(f"Product with SKU '{data.get('sku')}' already exists in this tenant") from exc
            elif "barcode" in error_str:
                raise DuplicateBarcodeError(f"Product with barcode '{barcode}' already exists in this tenant") from exc
            raise ProductError("Failed to create product") from exc

    def update(self, product_id: UUID, data: dict) -> Optional[Product]:
        """Update a product within the current tenant."""
        product = self.get_by_id(product_id)
        if not product:
            return None

        # Check for duplicate SKU if updating
        new_sku = data.get('sku')
        if new_sku and new_sku != product.sku:
            existing = self.get_by_sku(new_sku)
            if existing:
                raise DuplicateSKUError(f"Product with SKU '{new_sku}' already exists in this tenant")

        # Check for duplicate barcode if updating
        new_barcode = data.get('barcode')
        if new_barcode and new_barcode != product.barcode:
            existing = self.get_by_barcode(new_barcode)
            if existing:
                raise DuplicateBarcodeError(f"Product with barcode '{new_barcode}' already exists in this tenant")

        # Don't allow changing tenant_id
        if 'tenant_id' in data:
            del data['tenant_id']

        try:
            return super().update(product_id, data)
        except IntegrityError as exc:
            self.session.rollback()
            error_str = str(exc).lower()
            if "sku" in error_str:
                raise DuplicateSKUError(f"Product with SKU '{new_sku}' already exists in this tenant") from exc
            elif "barcode" in error_str:
                raise DuplicateBarcodeError(f"Product with barcode '{new_barcode}' already exists in this tenant") from exc
            raise ProductError("Failed to update product") from exc

    def soft_delete(self, product_id: UUID) -> bool:
        """Soft delete a product by setting status to 'inactive'."""
        product = self.get_by_id(product_id)
        if not product:
            return False

        product.status = "inactive"
        self.session.commit()
        return True

    def build_filtered_query(
        self,
        category: Optional[str] = None,
        search: Optional[str] = None,
        status: Optional[str] = None,
    ):
        """Build a products query with optional filters for the current tenant."""
        query = select(Product).where(self.get_tenant_filter())

        # Apply additional filters
        if category:
            query = query.where(Product.category == category)
        if status:
            query = query.where(Product.status == status)
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Product.name.ilike(search_term),
                    Product.sku.ilike(search_term),
                    Product.barcode.ilike(search_term),
                    Product.category.ilike(search_term)
                )
            )

        return query.order_by(Product.name.asc())
