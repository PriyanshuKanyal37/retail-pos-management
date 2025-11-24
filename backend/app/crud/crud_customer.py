"""
CRUD operations for Customer model.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.customer import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate


class CRUDCustomer(CRUDBase[Customer, CustomerCreate, CustomerUpdate]):
    """
    CRUD operations for Customer model with multi-tenant support.
    """

    def get_by_phone(
        self,
        db: Session,
        *,
        phone: str,
        tenant_id: UUID,
        store_id: Optional[UUID] = None
    ) -> Optional[Customer]:
        """
        Get a customer by phone number with tenant and store filtering.

        Args:
            db: Database session
            phone: Customer phone number
            tenant_id: Tenant ID
            store_id: Optional store ID for multi-store filtering

        Returns:
            Customer instance or None if not found
        """
        conditions = [Customer.phone == phone, Customer.tenant_id == tenant_id]
        if store_id:
            conditions.append(Customer.store_id == store_id)

        query = select(Customer).where(and_(*conditions))
        result =  db.execute(query)
        return result.scalar_one_or_none()

    def phone_exists(
        self,
        db: Session,
        *,
        phone: str,
        tenant_id: UUID,
        store_id: Optional[UUID] = None,
        exclude_customer_id: Optional[UUID] = None
    ) -> bool:
        """
        Check if phone number exists for a customer (excluding a specific customer if provided).

        Args:
            db: Database session
            phone: Phone number to check
            tenant_id: Tenant ID
            store_id: Optional store ID for multi-store filtering
            exclude_customer_id: Customer ID to exclude from check

        Returns:
            True if phone number exists, False otherwise
        """
        conditions = [Customer.phone == phone, Customer.tenant_id == tenant_id]
        if store_id:
            conditions.append(Customer.store_id == store_id)

        query = select(func.count(Customer.id)).where(and_(*conditions))

        if exclude_customer_id:
            query = query.where(Customer.id != exclude_customer_id)

        result =  db.execute(query)
        count = result.scalar()
        return count > 0

    def search_customers(
        self,
        db: Session,
        *,
        search_term: str,
        tenant_id: UUID,
        store_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Customer]:
        """
        Search customers by name or phone number.

        Args:
            db: Database session
            search_term: Search term
            tenant_id: Tenant ID
            store_id: Optional store ID for multi-store filtering
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of matching customer instances
        """
        search_pattern = f"%{search_term}%"
        conditions = [
            Customer.tenant_id == tenant_id,
            Customer.name.ilike(search_pattern) | Customer.phone.ilike(f"%{search_term}%")
        ]
        if store_id:
            conditions.append(Customer.store_id == store_id)

        query = select(Customer).where(and_(*conditions))
        query = query.offset(skip).limit(limit).order_by(Customer.created_at.desc())
        result =  db.execute(query)
        return result.scalars().all()

    def get_customers_by_store(
        self,
        db: Session,
        *,
        store_id: UUID,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[Customer]:
        """
        Get customers for a specific store.

        Args:
            db: Database session
            store_id: Store ID
            tenant_id: Tenant ID
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of customer instances for the store
        """
        conditions = [Customer.store_id == store_id, Customer.tenant_id == tenant_id]

        query = select(Customer).where(and_(*conditions))
        query = query.offset(skip).limit(limit).order_by(Customer.created_at.desc())
        result =  db.execute(query)
        return result.scalars().all()

    def get_recent_customers(
        self,
        db: Session,
        *,
        tenant_id: UUID,
        days: int = 30,
        limit: int = 100
    ) -> List[Customer]:
        """
        Get recently created customers.

        Args:
            db: Database session
            tenant_id: Tenant ID
            days: Number of days to look back
            limit: Maximum number of records to return

        Returns:
            List of recent customer instances
        """
        from datetime import datetime, timedelta

        cutoff_date = datetime.utcnow() - timedelta(days=days)
        query = select(Customer).where(
            and_(
                Customer.tenant_id == tenant_id,
                Customer.created_at >= cutoff_date
            )
        )

        query = query.limit(limit).order_by(Customer.created_at.desc())
        result =  db.execute(query)
        return result.scalars().all()

    def get_customers_with_sales_count(
        self,
        db: Session,
        *,
        tenant_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> List[dict]:
        """
        Get customers with their sales count.

        Args:
            db: Database session
            tenant_id: Tenant ID
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of customers with sales count
        """
        from app.models.sale import Sale

        query = select(
            Customer,
            func.count(Sale.id).label('sales_count'),
            func.sum(Sale.total).label('total_spent')
        ).outerjoin(
            Sale, Customer.id == Sale.customer_id
        ).where(
            Customer.tenant_id == tenant_id
        ).group_by(
            Customer.id
        ).order_by(
            func.count(Sale.id).desc()
        ).offset(skip).limit(limit)

        result =  db.execute(query)
        customers_data = []

        for row in result:
            customer_data = {
                "customer": row.Customer,
                "sales_count": row.sales_count or 0,
                "total_spent": float(row.total_spent or 0)
            }
            customers_data.append(customer_data)

        return customers_data

    def get_top_customers(
        self,
        db: Session,
        *,
        tenant_id: UUID,
        limit: int = 10
    ) -> List[dict]:
        """
        Get top customers by total spending.

        Args:
            db: Database session
            tenant_id: Tenant ID
            limit: Maximum number of records to return

        Returns:
            List of top customers
        """
        from app.models.sale import Sale

        query = select(
            Customer,
            func.count(Sale.id).label('sales_count'),
            func.sum(Sale.total).label('total_spent')
        ).join(
            Sale, Customer.id == Sale.customer_id
        ).where(
            and_(
                Customer.tenant_id == tenant_id,
                Sale.status == "completed"
            )
        ).group_by(
            Customer.id
        ).order_by(
            func.sum(Sale.total).desc()
        ).limit(limit)

        result =  db.execute(query)
        top_customers = []

        for row in result:
            customer_data = {
                "customer": row.Customer,
                "sales_count": row.sales_count or 0,
                "total_spent": float(row.total_spent or 0)
            }
            top_customers.append(customer_data)

        return top_customers

    def get_customer_statistics(
        self,
        db: Session,
        *,
        tenant_id: UUID
    ) -> dict:
        """
        Get customer statistics for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID

        Returns:
            Dictionary with customer statistics
        """
        from app.models.sale import Sale

        # Total customers
        total_query = select(func.count(Customer.id)).where(Customer.tenant_id == tenant_id)
        total_result =  db.execute(total_query)
        total_customers = total_result.scalar() or 0

        # Customers with sales
        customers_with_sales_query = select(func.count(Customer.id.distinct())).join(
            Sale, Customer.id == Sale.customer_id
        ).where(
            and_(
                Customer.tenant_id == tenant_id,
                Sale.status == "completed"
            )
        )
        customers_with_sales_result =  db.execute(customers_with_sales_query)
        customers_with_sales = customers_with_sales_result.scalar() or 0

        # Customers without sales
        customers_without_sales = total_customers - customers_with_sales

        # Recent customers (last 30 days)
        from datetime import datetime, timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=30)
        recent_query = select(func.count(Customer.id)).where(
            and_(
                Customer.tenant_id == tenant_id,
                Customer.created_at >= cutoff_date
            )
        )
        recent_result =  db.execute(recent_query)
        recent_customers = recent_result.scalar() or 0

        return {
            "total_customers": total_customers,
            "customers_with_sales": customers_with_sales,
            "customers_without_sales": customers_without_sales,
            "recent_customers": recent_customers,
        }


# Create a singleton instance
crud_customer = CRUDCustomer(Customer)
