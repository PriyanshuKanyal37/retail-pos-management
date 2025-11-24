"""
CRUD operations for Tenant model.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.tenant import Tenant
from app.schemas.tenant import TenantCreate, TenantUpdate


class CRUDTenant(CRUDBase[Tenant, TenantCreate, TenantUpdate]):
    """
    CRUD operations for Tenant model.
    """

    def get_by_domain(
        self,
        db: Session,
        *,
        domain: str
    ) -> Optional[Tenant]:
        """
        Get a tenant by domain.

        Args:
            db: Database session
            domain: Tenant domain

        Returns:
            Tenant instance or None if not found
        """
        query = select(Tenant).where(Tenant.domain == domain)
        result =  db.execute(query)
        return result.scalar_one_or_none()

    def get_by_name(
        self,
        db: Session,
        *,
        name: str
    ) -> Optional[Tenant]:
        """
        Get a tenant by name.

        Args:
            db: Database session
            name: Tenant name

        Returns:
            Tenant instance or None if not found
        """
        query = select(Tenant).where(Tenant.name == name)
        result =  db.execute(query)
        return result.scalar_one_or_none()

    def get_active_tenants(
        self,
        db: Session,
        *,
        skip: int = 0,
        limit: int = 100
    ) -> List[Tenant]:
        """
        Get all active tenants.

        Args:
            db: Database session
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of active tenant instances
        """
        query = select(Tenant).where(Tenant.status == "active").offset(skip).limit(limit)
        query = query.order_by(Tenant.created_at.desc())
        result =  db.execute(query)
        return result.scalars().all()

    def get_statistics(
        self,
        db: Session,
        *,
        tenant_id: UUID
    ) -> dict:
        """
        Get tenant statistics including user counts, product counts, etc.

        Args:
            db: Database session
            tenant_id: Tenant ID

        Returns:
            Dictionary with tenant statistics
        """
        from app.models.user import User
        from app.models.product import Product
        from app.models.customer import Customer
        from app.models.sale import Sale

        # Get tenant info
        tenant =  self.get(db, id=tenant_id)
        if not tenant:
            return {}

        # Count users
        user_count_query = select(func.count(User.id)).where(User.tenant_id == tenant_id)
        user_count_result =  db.execute(user_count_query)
        total_users = user_count_result.scalar() or 0

        # Count active users
        active_user_count_query = select(func.count(User.id)).where(
            User.tenant_id == tenant_id,
            User.status == "active"
        )
        active_user_count_result =  db.execute(active_user_count_query)
        active_users = active_user_count_result.scalar() or 0

        # Count products
        product_count_query = select(func.count(Product.id)).where(Product.tenant_id == tenant_id)
        product_count_result =  db.execute(product_count_query)
        total_products = product_count_result.scalar() or 0

        # Count active products
        active_product_count_query = select(func.count(Product.id)).where(
            Product.tenant_id == tenant_id,
            Product.status == "active"
        )
        active_product_count_result =  db.execute(active_product_count_query)
        active_products = active_product_count_result.scalar() or 0

        # Count customers
        customer_count_query = select(func.count(Customer.id)).where(Customer.tenant_id == tenant_id)
        customer_count_result =  db.execute(customer_count_query)
        total_customers = customer_count_result.scalar() or 0

        # Count sales
        sale_count_query = select(func.count(Sale.id)).where(Sale.tenant_id == tenant_id)
        sale_count_result =  db.execute(sale_count_query)
        total_sales = sale_count_result.scalar() or 0

        # Sum total revenue
        revenue_query = select(func.sum(Sale.total)).where(Sale.tenant_id == tenant_id)
        revenue_result =  db.execute(revenue_query)
        total_revenue = revenue_result.scalar() or 0

        return {
            "tenant_id": tenant_id,
            "tenant_name": tenant.name,
            "total_users": total_users,
            "active_users": active_users,
            "total_products": total_products,
            "active_products": active_products,
            "total_customers": total_customers,
            "total_sales": total_sales,
            "total_revenue": float(total_revenue),
        }


# Create a singleton instance
crud_tenant = CRUDTenant(Tenant)
