"""
CRUD operations for Sale model.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.sale import Sale
from app.schemas.sale import SaleCreate, SaleUpdate


class CRUDSale(CRUDBase[Sale, SaleCreate, SaleUpdate]):
    """
    CRUD operations for Sale model with multi-tenant support.
    """

    def get_by_invoice_no(
        self,
        db: Session,
        *,
        invoice_no: str,
        tenant_id: UUID
    ) -> Optional[Sale]:
        """
        Get a sale by invoice number with tenant filtering.

        Args:
            db: Database session
            invoice_no: Invoice number
            tenant_id: Tenant ID

        Returns:
            Sale instance or None if not found
        """
        query = select(Sale).where(
            and_(Sale.invoice_no == invoice_no, Sale.tenant_id == tenant_id)
        )
        result = db.execute(query)
        return result.scalar_one_or_none()

    def create_with_items(
        self,
        db: Session,
        *,
        obj_in: SaleCreate,
        tenant_id: UUID
    ) -> Sale:
        """
        Create a sale with its items.

        Args:
            db: Database session
            obj_in: Sale creation data with items
            tenant_id: Tenant ID

        Returns:
            Created sale instance with items

        Raises:
            ValueError: If validation fails
        """
        try:
            # Extract sale data
            sale_data = obj_in.dict(exclude={"items"})
            sale_data["tenant_id"] = tenant_id

            # Create sale
            db_sale = Sale(**sale_data)
            db.add(db_sale)

            # Add items if provided
            if obj_in.items:
                from app.models.sale_item import SaleItem
                from app.crud.crud_product import crud_product

                for item_data in obj_in.items:
                    # Create sale item
                    item_dict = item_data.dict()
                    item_dict["tenant_id"] = tenant_id
                    db_item = SaleItem(**item_dict, sale_id=db_sale.id)
                    db.add(db_item)

                    # Update product stock
                    if item_data.product_id:
                        product = crud_product.get(
                            db, id=item_data.product_id, tenant_id=tenant_id
                        )
                        if product:
                            new_stock = product.stock - item_data.quantity
                            if new_stock < 0:
                                raise ValueError(f"Insufficient stock for product {product.name}")
                            crud_product.update_stock(
                                db, product_id=item_data.product_id,
                                new_stock=new_stock, tenant_id=tenant_id
                            )

            db.commit()
            db.refresh(db_sale)
            return db_sale

        except Exception as e:
            db.rollback()
            raise e

    def get_by_customer(
        self,
        db: Session,
        *,
        customer_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Sale]:
        """
        Get sales by customer.

        Args:
            db: Database session
            customer_id: Customer ID
            tenant_id: Tenant ID
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of sale instances
        """
        query = select(Sale).where(
            and_(Sale.customer_id == customer_id, Sale.tenant_id == tenant_id)
        )

        query = query.offset(skip).limit(limit).order_by(desc(Sale.created_at))
        result = db.execute(query)
        return result.scalars().all()

    def get_by_cashier(
        self,
        db: Session,
        *,
        cashier_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Sale]:
        """
        Get sales by cashier.

        Args:
            db: Database session
            cashier_id: Cashier ID
            tenant_id: Tenant ID
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of sale instances
        """
        query = select(Sale).where(
            and_(Sale.cashier_id == cashier_id, Sale.tenant_id == tenant_id)
        )

        query = query.offset(skip).limit(limit).order_by(desc(Sale.created_at))
        result = db.execute(query)
        return result.scalars().all()

    def get_by_date_range(
        self,
        db: Session,
        *,
        start_date: datetime,
        end_date: datetime,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Sale]:
        """
        Get sales within a date range.

        Args:
            db: Database session
            start_date: Start date
            end_date: End date
            tenant_id: Tenant ID
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of sale instances
        """
        query = select(Sale).where(
            and_(
                Sale.tenant_id == tenant_id,
                Sale.created_at >= start_date,
                Sale.created_at <= end_date
            )
        )

        query = query.offset(skip).limit(limit).order_by(desc(Sale.created_at))
        result = db.execute(query)
        return result.scalars().all()

    def get_today_sales(
        self,
        db: Session,
        *,
        tenant_id: UUID
    ) -> List[Sale]:
        """
        Get today's sales for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID

        Returns:
            List of today's sale instances
        """
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        query = select(Sale).where(
            and_(
                Sale.tenant_id == tenant_id,
                Sale.created_at >= today_start,
                Sale.created_at < today_end
            )
        ).order_by(desc(Sale.created_at))

        result = db.execute(query)
        return result.scalars().all()

    def get_this_week_sales(
        self,
        db: Session,
        *,
        tenant_id: UUID
    ) -> List[Sale]:
        """
        Get this week's sales for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID

        Returns:
            List of this week's sale instances
        """
        today = datetime.utcnow().date()
        week_start = today - timedelta(days=today.weekday())
        week_start_datetime = datetime.combine(week_start, datetime.min.time())

        query = select(Sale).where(
            and_(
                Sale.tenant_id == tenant_id,
                Sale.created_at >= week_start_datetime
            )
        ).order_by(desc(Sale.created_at))

        result = db.execute(query)
        return result.scalars().all()

    def get_this_month_sales(
        self,
        db: Session,
        *,
        tenant_id: UUID
    ) -> List[Sale]:
        """
        Get this month's sales for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID

        Returns:
            List of this month's sale instances
        """
        today = datetime.utcnow().date()
        month_start = today.replace(day=1)
        month_start_datetime = datetime.combine(month_start, datetime.min.time())

        query = select(Sale).where(
            and_(
                Sale.tenant_id == tenant_id,
                Sale.created_at >= month_start_datetime
            )
        ).order_by(desc(Sale.created_at))

        result = db.execute(query)
        return result.scalars().all()

    def get_sales_summary(
        self,
        db: Session,
        *,
        start_date: datetime,
        end_date: datetime,
        tenant_id: UUID
    ) -> dict:
        """
        Get sales summary for a date range.

        Args:
            db: Database session
            start_date: Start date
            end_date: End date
            tenant_id: Tenant ID

        Returns:
            Dictionary with sales summary
        """
        # Total sales
        total_sales_query = select(func.count(Sale.id)).where(
            and_(
                Sale.tenant_id == tenant_id,
                Sale.created_at >= start_date,
                Sale.created_at <= end_date
            )
        )
        total_sales_result = db.execute(total_sales_query)
        total_sales = total_sales_result.scalar() or 0

        # Total revenue
        total_revenue_query = select(func.sum(Sale.total)).where(
            and_(
                Sale.tenant_id == tenant_id,
                Sale.created_at >= start_date,
                Sale.created_at <= end_date
            )
        )
        total_revenue_result = db.execute(total_revenue_query)
        total_revenue = float(total_revenue_result.scalar() or 0)

        # Total discount
        total_discount_query = select(func.sum(Sale.discount)).where(
            and_(
                Sale.tenant_id == tenant_id,
                Sale.created_at >= start_date,
                Sale.created_at <= end_date
            )
        )
        total_discount_result = db.execute(total_discount_query)
        total_discount = float(total_discount_result.scalar() or 0)

        # Average order value
        average_order_value = total_revenue / total_sales if total_sales > 0 else 0

        # Payment method breakdown
        payment_breakdown_query = select(
            Sale.payment_method,
            func.count(Sale.id).label('count'),
            func.sum(Sale.total).label('total')
        ).where(
            and_(
                Sale.tenant_id == tenant_id,
                Sale.created_at >= start_date,
                Sale.created_at <= end_date
            )
        ).group_by(Sale.payment_method)

        payment_breakdown_result = db.execute(payment_breakdown_query)
        payment_breakdown = []

        for row in payment_breakdown_result:
            payment_breakdown.append({
                "method": row.payment_method,
                "count": row.count,
                "total": float(row.total or 0)
            })

        return {
            "total_sales": total_sales,
            "total_revenue": total_revenue,
            "total_discount": total_discount,
            "average_order_value": average_order_value,
            "payment_breakdown": payment_breakdown,
        }

    def get_top_products(
        self,
        db: Session,
        *,
        start_date: datetime,
        end_date: datetime,
        tenant_id: UUID,
        limit: int = 10
    ) -> List[dict]:
        """
        Get top selling products for a date range.

        Args:
            db: Database session
            start_date: Start date
            end_date: End date
            tenant_id: Tenant ID
            limit: Maximum number of products to return

        Returns:
            List of top products with sales data
        """
        from app.models.sale_item import SaleItem
        from app.models.product import Product

        query = select(
            Product.id.label('product_id'),
            Product.name.label('product_name'),
            func.sum(SaleItem.quantity).label('total_quantity'),
            func.sum(SaleItem.quantity * SaleItem.unit_price).label('total_revenue')
        ).join(
            SaleItem, Product.id == SaleItem.product_id
        ).join(
            Sale, SaleItem.sale_id == Sale.id
        ).where(
            and_(
                Sale.tenant_id == tenant_id,
                Sale.created_at >= start_date,
                Sale.created_at <= end_date
            )
        ).group_by(
            Product.id, Product.name
        ).order_by(
            desc(func.sum(SaleItem.quantity))
        ).limit(limit)

        result = db.execute(query)
        top_products = []

        for row in result:
            top_products.append({
                "product_id": row.product_id,
                "product_name": row.product_name,
                "quantity": row.total_quantity or 0,
                "revenue": float(row.total_revenue or 0)
            })

        return top_products

    def get_daily_sales_data(
        self,
        db: Session,
        *,
        start_date: datetime,
        end_date: datetime,
        tenant_id: UUID
    ) -> List[dict]:
        """
        Get daily sales data for a date range.

        Args:
            db: Database session
            start_date: Start date
            end_date: End date
            tenant_id: Tenant ID

        Returns:
            List of daily sales data
        """
        query = select(
            func.date(Sale.created_at).label('date'),
            func.count(Sale.id).label('sales_count'),
            func.sum(Sale.total).label('revenue')
        ).where(
            and_(
                Sale.tenant_id == tenant_id,
                Sale.created_at >= start_date,
                Sale.created_at <= end_date
            )
        ).group_by(
            func.date(Sale.created_at)
        ).order_by('date')

        result = db.execute(query)
        daily_data = []

        for row in result:
            daily_data.append({
                "date": row.date.isoformat(),
                "sales_count": row.sales_count,
                "revenue": float(row.revenue or 0)
            })

        return daily_data

    def get_sale_statistics(
        self,
        db: Session,
        *,
        tenant_id: UUID
    ) -> dict:
        """
        Get overall sale statistics for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID

        Returns:
            Dictionary with sale statistics
        """
        # Total sales
        total_query = select(func.count(Sale.id)).where(Sale.tenant_id == tenant_id)
        total_result = db.execute(total_query)
        total_sales = total_result.scalar() or 0

        # Today's sales
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_sales_query = select(func.count(Sale.id)).where(
            and_(Sale.tenant_id == tenant_id, Sale.created_at >= today_start)
        )
        today_sales_result = db.execute(today_sales_query)
        today_sales = today_sales_result.scalar() or 0

        # This week's sales
        today = datetime.utcnow().date()
        week_start = today - timedelta(days=today.weekday())
        week_start_datetime = datetime.combine(week_start, datetime.min.time())
        week_sales_query = select(func.count(Sale.id)).where(
            and_(Sale.tenant_id == tenant_id, Sale.created_at >= week_start_datetime)
        )
        week_sales_result = db.execute(week_sales_query)
        week_sales = week_sales_result.scalar() or 0

        # This month's sales
        month_start = today.replace(day=1)
        month_start_datetime = datetime.combine(month_start, datetime.min.time())
        month_sales_query = select(func.count(Sale.id)).where(
            and_(Sale.tenant_id == tenant_id, Sale.created_at >= month_start_datetime)
        )
        month_sales_result = db.execute(month_sales_query)
        month_sales = month_sales_result.scalar() or 0

        return {
            "total_sales": total_sales,
            "today_sales": today_sales,
            "week_sales": week_sales,
            "month_sales": month_sales,
        }

    def get_sales_by_store(
        self,
        db: Session,
        *,
        store_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None
    ) -> List[Sale]:
        """
        Get sales for a specific store.

        Args:
            db: Database session
            store_id: Store ID
            tenant_id: Tenant ID
            skip: Number of records to skip
            limit: Maximum number of records to return
            status: Optional status filter

        Returns:
            List of sale instances for the store
        """
        conditions = [Sale.store_id == store_id, Sale.tenant_id == tenant_id]
        if status:
            conditions.append(Sale.status == status)

        query = select(Sale).where(and_(*conditions))
        query = query.offset(skip).limit(limit).order_by(Sale.created_at.desc())
        result = db.execute(query)
        return result.scalars().all()

    def get_store_sales_summary(
        self,
        db: Session,
        *,
        store_id: UUID,
        tenant_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> dict:
        """
        Get sales summary for a specific store and date range.

        Args:
            db: Database session
            store_id: Store ID
            tenant_id: Tenant ID
            start_date: Optional start date
            end_date: Optional end date

        Returns:
            Dictionary with store sales summary
        """
        conditions = [Sale.store_id == store_id, Sale.tenant_id == tenant_id]

        if start_date:
            conditions.append(Sale.created_at >= start_date)
        if end_date:
            conditions.append(Sale.created_at <= end_date)

        # Total sales
        total_sales_query = select(func.count(Sale.id)).where(and_(*conditions))
        total_sales_result = db.execute(total_sales_query)
        total_sales = total_sales_result.scalar() or 0

        # Total revenue
        total_revenue_query = select(func.sum(Sale.total)).where(and_(*conditions))
        total_revenue_result = db.execute(total_revenue_query)
        total_revenue = float(total_revenue_result.scalar() or 0)

        return {
            "store_id": store_id,
            "total_sales": total_sales,
            "total_revenue": total_revenue,
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
        }

    def get_latest_invoice_for_tenant(
        self,
        db: Session,
        *,
        tenant_id: UUID
    ) -> Optional[Sale]:
        """
        Get the most recently created sale for a tenant.
        """
        query = (
            select(Sale)
            .where(Sale.tenant_id == tenant_id)
            .order_by(desc(Sale.invoice_no))
            .limit(1)
        )
        result = db.execute(query)
        return result.scalar_one_or_none()


# Create a singleton instance
crud_sale = CRUDSale(Sale)
