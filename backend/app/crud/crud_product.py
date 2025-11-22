"""
CRUD operations for Product model.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


class CRUDProduct(CRUDBase[Product, ProductCreate, ProductUpdate]):
    """
    CRUD operations for Product model with multi-tenant support.
    """

    async def get_by_sku(
        self,
        db: AsyncSession,
        *,
        sku: str,
        tenant_id: UUID,
        store_id: Optional[UUID] = None
    ) -> Optional[Product]:
        """
        Get a product by SKU with tenant and store filtering.

        Args:
            db: Database session
            sku: Product SKU
            tenant_id: Tenant ID
            store_id: Optional store ID for multi-store filtering

        Returns:
            Product instance or None if not found
        """
        conditions = [Product.sku == sku, Product.tenant_id == tenant_id]
        if store_id:
            conditions.append(Product.store_id == store_id)

        query = select(Product).where(and_(*conditions))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_barcode(
        self,
        db: AsyncSession,
        *,
        barcode: str,
        tenant_id: UUID,
        store_id: Optional[UUID] = None
    ) -> Optional[Product]:
        """
        Get a product by barcode with tenant and store filtering.

        Args:
            db: Database session
            barcode: Product barcode
            tenant_id: Tenant ID
            store_id: Optional store ID for multi-store filtering

        Returns:
            Product instance or None if not found
        """
        conditions = [Product.barcode == barcode, Product.tenant_id == tenant_id]
        if store_id:
            conditions.append(Product.store_id == store_id)

        query = select(Product).where(and_(*conditions))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def sku_exists(
        self,
        db: AsyncSession,
        *,
        sku: str,
        tenant_id: UUID,
        store_id: Optional[UUID] = None,
        exclude_product_id: Optional[UUID] = None
    ) -> bool:
        """
        Check if SKU exists for a product (excluding a specific product if provided).

        Args:
            db: Database session
            sku: SKU to check
            tenant_id: Tenant ID
            store_id: Optional store ID for multi-store filtering
            exclude_product_id: Product ID to exclude from check

        Returns:
            True if SKU exists, False otherwise
        """
        conditions = [Product.sku == sku, Product.tenant_id == tenant_id]
        if store_id:
            conditions.append(Product.store_id == store_id)

        query = select(func.count(Product.id)).where(and_(*conditions))

        if exclude_product_id:
            query = query.where(Product.id != exclude_product_id)

        result = await db.execute(query)
        count = result.scalar()
        return count > 0

    async def barcode_exists(
        self,
        db: AsyncSession,
        *,
        barcode: str,
        tenant_id: UUID,
        store_id: Optional[UUID] = None,
        exclude_product_id: Optional[UUID] = None
    ) -> bool:
        """
        Check if barcode exists for a product (excluding a specific product if provided).

        Args:
            db: Database session
            barcode: Barcode to check
            tenant_id: Tenant ID
            store_id: Optional store ID for multi-store filtering
            exclude_product_id: Product ID to exclude from check

        Returns:
            True if barcode exists, False otherwise
        """
        if not barcode:
            return False

        conditions = [Product.barcode == barcode, Product.tenant_id == tenant_id]
        if store_id:
            conditions.append(Product.store_id == store_id)

        query = select(func.count(Product.id)).where(and_(*conditions))

        if exclude_product_id:
            query = query.where(Product.id != exclude_product_id)

        result = await db.execute(query)
        count = result.scalar()
        return count > 0

    async def search_products(
        self,
        db: AsyncSession,
        *,
        search_term: str,
        tenant_id: UUID,
        store_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Product]:
        """
        Search products by name, SKU, or barcode.

        Args:
            db: Database session
            search_term: Search term
            tenant_id: Tenant ID
            store_id: Optional store ID for multi-store filtering
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of matching product instances
        """
        search_pattern = f"%{search_term}%"
        conditions = [
            Product.tenant_id == tenant_id,
            Product.name.ilike(search_pattern) |
            Product.sku.ilike(search_pattern) |
            Product.barcode.ilike(search_pattern) |
            Product.category.ilike(search_pattern)
        ]
        if store_id:
            conditions.append(Product.store_id == store_id)

        query = select(Product).where(and_(*conditions))
        query = query.offset(skip).limit(limit).order_by(Product.name)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_by_category(
        self,
        db: AsyncSession,
        *,
        category: str,
        tenant_id: UUID,
        store_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Product]:
        """
        Get products by category.

        Args:
            db: Database session
            category: Product category
            tenant_id: Tenant ID
            store_id: Optional store ID for multi-store filtering
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of product instances in the category
        """
        conditions = [Product.category == category, Product.tenant_id == tenant_id]
        if store_id:
            conditions.append(Product.store_id == store_id)

        query = select(Product).where(and_(*conditions))
        query = query.offset(skip).limit(limit).order_by(Product.name)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_categories(
        self,
        db: AsyncSession,
        *,
        tenant_id: UUID,
        store_id: Optional[UUID] = None
    ) -> List[str]:
        """
        Get all unique categories for a tenant and optionally for a specific store.

        Args:
            db: Database session
            tenant_id: Tenant ID
            store_id: Optional store ID for multi-store filtering

        Returns:
            List of unique category names
        """
        conditions = [Product.tenant_id == tenant_id, Product.category.isnot(None)]
        if store_id:
            conditions.append(Product.store_id == store_id)

        query = select(Product.category).where(and_(*conditions)).distinct()

        result = await db.execute(query)
        categories = [row[0] for row in result if row[0]]
        return sorted(categories)

    async def get_products_by_store(
        self,
        db: AsyncSession,
        *,
        store_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[Product]:
        """
        Get products for a specific store.

        Args:
            db: Database session
            store_id: Store ID
            tenant_id: Tenant ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            status: Optional status filter

        Returns:
            List of product instances for the store
        """
        conditions = [Product.store_id == store_id, Product.tenant_id == tenant_id]
        if status:
            conditions.append(Product.status == status)

        query = select(Product).where(and_(*conditions))
        query = query.offset(skip).limit(limit).order_by(Product.name)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_low_stock_products(
        self,
        db: AsyncSession,
        *,
        tenant_id: UUID,
        threshold: Optional[int] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Product]:
        """
        Get products with low stock.

        Args:
            db: Database session
            tenant_id: Tenant ID
            threshold: Low stock threshold (default: 5)
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of low stock product instances
        """
        if threshold is None:
            # Get default threshold from settings or use 5
            threshold = 5

        query = select(Product).where(
            and_(
                Product.tenant_id == tenant_id,
                Product.stock <= threshold,
                Product.status == "active"
            )
        )

        query = query.offset(skip).limit(limit).order_by(Product.stock.asc())
        result = await db.execute(query)
        return result.scalars().all()

    async def get_out_of_stock_products(
        self,
        db: AsyncSession,
        *,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Product]:
        """
        Get products that are out of stock.

        Args:
            db: Database session
            tenant_id: Tenant ID
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of out of stock product instances
        """
        query = select(Product).where(
            and_(
                Product.tenant_id == tenant_id,
                Product.stock == 0,
                Product.status == "active"
            )
        )

        query = query.offset(skip).limit(limit).order_by(Product.name)
        result = await db.execute(query)
        return result.scalars().all()

    async def update_stock(
        self,
        db: AsyncSession,
        *,
        product_id: UUID,
        new_stock: int,
        tenant_id: UUID
    ) -> Optional[Product]:
        """
        Update product stock.

        Args:
            db: Database session
            product_id: Product ID
            new_stock: New stock quantity
            tenant_id: Tenant ID

        Returns:
            Updated product instance or None if not found
        """
        query = select(Product).where(
            and_(Product.id == product_id, Product.tenant_id == tenant_id)
        )
        result = await db.execute(query)
        product = result.scalar_one_or_none()

        if product:
            product.stock = new_stock
            await db.commit()
            await db.refresh(product)

        return product

    async def adjust_stock(
        self,
        db: AsyncSession,
        *,
        product_id: UUID,
        adjustment: int,
        tenant_id: UUID
    ) -> Optional[Product]:
        """
        Adjust product stock by a given amount (positive or negative).

        Args:
            db: Database session
            product_id: Product ID
            adjustment: Stock adjustment amount
            tenant_id: Tenant ID

        Returns:
            Updated product instance or None if not found
        """
        query = select(Product).where(
            and_(Product.id == product_id, Product.tenant_id == tenant_id)
        )
        result = await db.execute(query)
        product = result.scalar_one_or_none()

        if product:
            new_stock = max(0, product.stock + adjustment)  # Prevent negative stock
            product.stock = new_stock
            await db.commit()
            await db.refresh(product)

        return product

    async def get_product_statistics(
        self,
        db: AsyncSession,
        *,
        tenant_id: UUID
    ) -> dict:
        """
        Get product statistics for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID

        Returns:
            Dictionary with product statistics
        """
        # Total products
        total_query = select(func.count(Product.id)).where(Product.tenant_id == tenant_id)
        total_result = await db.execute(total_query)
        total_products = total_result.scalar() or 0

        # Active products
        active_query = select(func.count(Product.id)).where(
            and_(Product.tenant_id == tenant_id, Product.status == "active")
        )
        active_result = await db.execute(active_query)
        active_products = active_result.scalar() or 0

        # Low stock products
        low_stock_query = select(func.count(Product.id)).where(
            and_(
                Product.tenant_id == tenant_id,
                Product.stock <= 5,
                Product.status == "active"
            )
        )
        low_stock_result = await db.execute(low_stock_query)
        low_stock_products = low_stock_result.scalar() or 0

        # Out of stock products
        out_of_stock_query = select(func.count(Product.id)).where(
            and_(
                Product.tenant_id == tenant_id,
                Product.stock == 0,
                Product.status == "active"
            )
        )
        out_of_stock_result = await db.execute(out_of_stock_query)
        out_of_stock_products = out_of_stock_result.scalar() or 0

        # Total inventory value
        inventory_value_query = select(func.sum(Product.stock * Product.price)).where(
            Product.tenant_id == tenant_id
        )
        inventory_value_result = await db.execute(inventory_value_query)
        total_inventory_value = float(inventory_value_result.scalar() or 0)

        # Categories count
        categories_query = select(func.count(func.distinct(Product.category))).where(
            and_(Product.tenant_id == tenant_id, Product.category.isnot(None))
        )
        categories_result = await db.execute(categories_query)
        total_categories = categories_result.scalar() or 0

        return {
            "total_products": total_products,
            "active_products": active_products,
            "inactive_products": total_products - active_products,
            "low_stock_products": low_stock_products,
            "out_of_stock_products": out_of_stock_products,
            "total_inventory_value": total_inventory_value,
            "total_categories": total_categories,
        }


# Create a singleton instance
crud_product = CRUDProduct(Product)