"""
CRUD operations for SaleItem model.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.base import CRUDBase
from app.models.sale_item import SaleItem
from app.schemas.sale_item import SaleItemCreate, SaleItemUpdate


class CRUDSaleItem(CRUDBase[SaleItem, SaleItemCreate, SaleItemUpdate]):
    """
    CRUD operations for SaleItem model with multi-tenant support.
    """

    async def get_by_sale(
        self,
        db: AsyncSession,
        *,
        sale_id: UUID,
        tenant_id: UUID
    ) -> List[SaleItem]:
        """
        Get all sale items for a specific sale.

        Args:
            db: Database session
            sale_id: Sale ID
            tenant_id: Tenant ID

        Returns:
            List of sale item instances
        """
        query = select(SaleItem).where(
            and_(SaleItem.sale_id == sale_id, SaleItem.tenant_id == tenant_id)
        ).order_by(SaleItem.id)

        result = await db.execute(query)
        return result.scalars().all()

    async def get_by_product(
        self,
        db: AsyncSession,
        *,
        product_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[SaleItem]:
        """
        Get sale items for a specific product.

        Args:
            db: Database session
            product_id: Product ID
            tenant_id: Tenant ID
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of sale item instances
        """
        query = select(SaleItem).where(
            and_(SaleItem.product_id == product_id, SaleItem.tenant_id == tenant_id)
        ).offset(skip).limit(limit).order_by(SaleItem.id.desc())

        result = await db.execute(query)
        return result.scalars().all()

    async def create_batch(
        self,
        db: AsyncSession,
        *,
        items: List[SaleItemCreate],
        sale_id: UUID,
        tenant_id: UUID
    ) -> List[SaleItem]:
        """
        Create multiple sale items for a sale.

        Args:
            db: Database session
            items: List of sale item creation data
            sale_id: Sale ID
            tenant_id: Tenant ID

        Returns:
            List of created sale item instances

        Raises:
            Exception: If database operation fails
        """
        try:
            db_items = []
            for item_data in items:
                item_dict = item_data.dict()
                item_dict["sale_id"] = sale_id
                item_dict["tenant_id"] = tenant_id

                # Calculate total if not provided
                if "total" not in item_dict or item_dict["total"] is None:
                    item_dict["total"] = item_dict["quantity"] * item_dict["unit_price"]

                db_item = SaleItem(**item_dict)
                db_items.append(db_item)

            db.add_all(db_items)
            await db.commit()

            # Refresh all items to get their IDs
            for db_item in db_items:
                await db.refresh(db_item)

            return db_items

        except Exception as e:
            await db.rollback()
            raise e

    async def get_product_sales_summary(
        self,
        db: AsyncSession,
        *,
        product_id: UUID,
        tenant_id: UUID
    ) -> dict:
        """
        Get sales summary for a specific product.

        Args:
            db: Database session
            product_id: Product ID
            tenant_id: Tenant ID

        Returns:
            Dictionary with product sales summary
        """
        from app.models.sale import Sale

        query = select(
            func.count(SaleItem.id).label('total_items_sold'),
            func.sum(SaleItem.quantity).label('total_quantity'),
            func.sum(SaleItem.total).label('total_revenue'),
            func.avg(SaleItem.unit_price).label('average_price')
        ).join(
            Sale, SaleItem.sale_id == Sale.id
        ).where(
            and_(
                SaleItem.product_id == product_id,
                SaleItem.tenant_id == tenant_id,
                Sale.status == "completed"
            )
        )

        result = await db.execute(query)
        row = result.first()

        return {
            "total_items_sold": row.total_items_sold or 0,
            "total_quantity": row.total_quantity or 0,
            "total_revenue": float(row.total_revenue or 0),
            "average_price": float(row.average_price or 0),
        }

    async def get_top_selling_items(
        self,
        db: AsyncSession,
        *,
        tenant_id: UUID,
        limit: int = 10
    ) -> List[dict]:
        """
        Get top selling items by quantity.

        Args:
            db: Database session
            tenant_id: Tenant ID
            limit: Maximum number of items to return

        Returns:
            List of top selling items
        """
        from app.models.sale import Sale
        from app.models.product import Product

        query = select(
            Product.id.label('product_id'),
            Product.name.label('product_name'),
            func.sum(SaleItem.quantity).label('total_quantity'),
            func.sum(SaleItem.total).label('total_revenue')
        ).join(
            SaleItem, Product.id == SaleItem.product_id
        ).join(
            Sale, SaleItem.sale_id == Sale.id
        ).where(
            and_(
                SaleItem.tenant_id == tenant_id,
                Sale.status == "completed"
            )
        ).group_by(
            Product.id, Product.name
        ).order_by(
            func.sum(SaleItem.quantity).desc()
        ).limit(limit)

        result = await db.execute(query)
        top_items = []

        for row in result:
            top_items.append({
                "product_id": row.product_id,
                "product_name": row.product_name,
                "total_quantity": row.total_quantity or 0,
                "total_revenue": float(row.total_revenue or 0)
            })

        return top_items

    async def get_daily_item_sales(
        self,
        db: AsyncSession,
        *,
        product_id: UUID,
        start_date,
        end_date,
        tenant_id: UUID
    ) -> List[dict]:
        """
        Get daily sales data for a specific product.

        Args:
            db: Database session
            product_id: Product ID
            start_date: Start date
            end_date: End date
            tenant_id: Tenant ID

        Returns:
            List of daily sales data
        """
        from app.models.sale import Sale

        query = select(
            func.date(Sale.created_at).label('date'),
            func.sum(SaleItem.quantity).label('quantity'),
            func.sum(SaleItem.total).label('revenue')
        ).join(
            Sale, SaleItem.sale_id == Sale.id
        ).where(
            and_(
                SaleItem.product_id == product_id,
                SaleItem.tenant_id == tenant_id,
                Sale.status == "completed",
                Sale.created_at >= start_date,
                Sale.created_at <= end_date
            )
        ).group_by(
            func.date(Sale.created_at)
        ).order_by('date')

        result = await db.execute(query)
        daily_data = []

        for row in result:
            daily_data.append({
                "date": row.date.isoformat(),
                "quantity": row.quantity or 0,
                "revenue": float(row.revenue or 0)
            })

        return daily_data

    async def get_category_sales_summary(
        self,
        db: AsyncSession,
        *,
        category: str,
        tenant_id: UUID
    ) -> dict:
        """
        Get sales summary for a specific product category.

        Args:
            db: Database session
            category: Product category
            tenant_id: Tenant ID

        Returns:
            Dictionary with category sales summary
        """
        from app.models.sale import Sale
        from app.models.product import Product

        query = select(
            func.count(SaleItem.id).label('total_items_sold'),
            func.sum(SaleItem.quantity).label('total_quantity'),
            func.sum(SaleItem.total).label('total_revenue')
        ).join(
            Sale, SaleItem.sale_id == Sale.id
        ).join(
            Product, SaleItem.product_id == Product.id
        ).where(
            and_(
                Product.category == category,
                SaleItem.tenant_id == tenant_id,
                Sale.status == "completed"
            )
        )

        result = await db.execute(query)
        row = result.first()

        return {
            "category": category,
            "total_items_sold": row.total_items_sold or 0,
            "total_quantity": row.total_quantity or 0,
            "total_revenue": float(row.total_revenue or 0),
        }


# Create a singleton instance
crud_sale_item = CRUDSaleItem(SaleItem)