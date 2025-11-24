"""
CRUD operations for Store model.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.store import Store
from app.models.user import User
from app.models.product import Product
from app.models.sale import Sale
from app.models.customer import Customer
from app.schemas.store import StoreCreate, StoreUpdate


class CRUDStore(CRUDBase[Store, StoreCreate, StoreUpdate]):
    """
    CRUD operations for Store model with multi-tenant support.
    """

    def get_by_name(
        self,
        db: Session,
        *,
        name: str,
        tenant_id: Optional[UUID] = None
    ) -> Optional[Store]:
        """
        Get a store by name with optional tenant filtering.

        Args:
            db: Database session
            name: Store name
            tenant_id: Optional tenant ID for multi-tenant isolation

        Returns:
            Store instance or None if not found
        """
        query = select(Store).where(Store.name == name)

        if tenant_id:
            query = query.where(Store.tenant_id == tenant_id)

        result =  db.execute(query)
        return result.scalar_one_or_none()

    def get_multi(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100,
        tenant_id: Optional[UUID] = None,
        status: Optional[str] = None
    ) -> List[Store]:
        """
        Get multiple stores.

        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return
            tenant_id: Optional tenant ID for multi-tenant isolation
            status: Optional status to filter stores

        Returns:
            List of store instances
        """
        query = select(Store)

        # Add tenant filtering
        if tenant_id:
            query = query.where(Store.tenant_id == tenant_id)

        # Add status filtering
        if status:
            query = query.where(Store.status == status)

        query = query.offset(skip).limit(limit).order_by(Store.created_at.desc())

        result =  db.execute(query)
        return result.scalars().all()

    def get_active_stores(
        self,
        db: Session,
        *,
        tenant_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Store]:
        """
        Get active stores.

        Args:
            db: Database session
            tenant_id: Optional tenant ID for multi-tenant isolation
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of active store instances
        """
        query = select(Store).where(Store.status == "active")

        if tenant_id:
            query = query.where(Store.tenant_id == tenant_id)

        query = query.offset(skip).limit(limit).order_by(Store.created_at.desc())

        result =  db.execute(query)
        return result.scalars().all()

    def search_stores(
        self,
        db: Session,
        *,
        search_term: str,
        tenant_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Store]:
        """
        Search stores by name or address.

        Args:
            db: Database session
            search_term: Search term
            tenant_id: Optional tenant ID for multi-tenant isolation
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of matching store instances
        """
        search_pattern = f"%{search_term}%"
        query = select(Store).where(
            and_(
                Store.name.ilike(search_pattern) | Store.address.ilike(search_pattern)
            )
        )

        if tenant_id:
            query = query.where(Store.tenant_id == tenant_id)

        query = query.offset(skip).limit(limit).order_by(Store.created_at.desc())

        result =  db.execute(query)
        return result.scalars().all()

    def name_exists(
        self,
        db: Session,
        *,
        name: str,
        tenant_id: Optional[UUID] = None,
        exclude_store_id: Optional[UUID] = None
    ) -> bool:
        """
        Check if store name exists (excluding a specific store if provided).

        Args:
            db: Database session
            name: Store name to check
            tenant_id: Optional tenant ID for multi-tenant isolation
            exclude_store_id: Store ID to exclude from check

        Returns:
            True if name exists, False otherwise
        """
        query = select(func.count(Store.id)).where(Store.name == name)

        if tenant_id:
            query = query.where(Store.tenant_id == tenant_id)

        if exclude_store_id:
            query = query.where(Store.id != exclude_store_id)

        result =  db.execute(query)
        count = result.scalar()
        return count > 0

    def get_store_statistics(
        self,
        db: Session,
        *,
        store_id: UUID,
        tenant_id: Optional[UUID] = None
    ) -> dict:
        """
        Get store statistics including product count, sales data, and user count.

        Args:
            db: Database session
            store_id: Store ID
            tenant_id: Optional tenant ID for verification

        Returns:
            Dictionary with store statistics
        """
        # Verify store exists and belongs to tenant if tenant_id provided
        store = self.get(db, id=store_id, tenant_id=tenant_id)
        if not store:
            return {}

        # Product count
        product_query = select(func.count(Product.id)).where(Product.store_id == store_id)
        product_result =  db.execute(product_query)
        product_count = product_result.scalar() or 0

        # Customer count
        customer_query = select(func.count(Customer.id)).where(Customer.store_id == store_id)
        customer_result =  db.execute(customer_query)
        customer_count = customer_result.scalar() or 0

        # User count (cashiers assigned to this store)
        user_query = select(func.count(User.id)).where(User.store_id == store_id)
        user_result =  db.execute(user_query)
        user_count = user_result.scalar() or 0

        # Sales data
        sales_query = select(func.count(Sale.id)).where(Sale.store_id == store_id)
        sales_result =  db.execute(sales_query)
        total_sales = sales_result.scalar() or 0

        # Today's sales
        from datetime import datetime
        today = datetime.now().date()
        today_sales_query = select(func.count(Sale.id)).where(
            and_(
                Sale.store_id == store_id,
                func.date(Sale.created_at) == today
            )
        )
        today_sales_result =  db.execute(today_sales_query)
        today_sales = today_sales_result.scalar() or 0

        # Total revenue (this would need to be calculated from sale_items)
        from app.models.sale_item import SaleItem
        revenue_query = select(func.coalesce(func.sum(SaleItem.quantity * SaleItem.unit_price), 0)).where(
            and_(
                SaleItem.store_id == store_id
            )
        )
        revenue_result =  db.execute(revenue_query)
        total_revenue = float(revenue_result.scalar() or 0)

        # Today's revenue
        today_revenue_query = select(func.coalesce(func.sum(SaleItem.quantity * SaleItem.unit_price), 0)).where(
            and_(
                SaleItem.store_id == store_id,
                func.date(SaleItem.created_at) == today
            )
        )
        today_revenue_result =  db.execute(today_revenue_query)
        today_revenue = float(today_revenue_result.scalar() or 0)

        return {
            "store_id": store_id,
            "store_name": store.name,
            "product_count": product_count,
            "customer_count": customer_count,
            "user_count": user_count,
            "total_sales": total_sales,
            "today_sales": today_sales,
            "total_revenue": total_revenue,
            "today_revenue": today_revenue,
        }

    
    def update_status(
        self,
        db: Session,
        *,
        store_id: UUID,
        status: str,
        tenant_id: Optional[UUID] = None
    ) -> Optional[Store]:
        """
        Update store status.

        Args:
            db: Database session
            store_id: Store ID
            status: New status value
            tenant_id: Optional tenant ID for verification

        Returns:
            Updated store instance or None if not found
        """
        store =  self.get(db, id=store_id, tenant_id=tenant_id)
        if not store:
            return None

        store.status = status
        db.add(store)
        db.commit()
        db.refresh(store)
        return store


# Create a singleton instance
crud_store = CRUDStore(Store)
