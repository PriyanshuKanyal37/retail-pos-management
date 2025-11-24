from typing import Optional, List, Sequence, Dict, Any
from uuid import UUID

from sqlalchemy import select, and_, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.tenant import Tenant
from app.models.user import User
from app.models.product import Product
from app.models.customer import Customer
from app.models.sale import Sale
from app.services.base import TenantAwareService
from app.schemas.tenant import TenantCreate, TenantUpdate
from app.core.security import get_password_hash
import logging

logger = logging.getLogger(__name__)


class TenantError(Exception):
    """Base class for tenant management errors."""

    def __init__(self, message: str, code: str = "TENANT_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class TenantNotFoundError(TenantError):
    """Raised when tenant is not found."""

    def __init__(self, tenant_id: Optional[UUID] = None, message: Optional[str] = None):
        if message:
            super().__init__(message)
        elif tenant_id:
            super().__init__(f"Tenant with ID {tenant_id} not found", "TENANT_NOT_FOUND")
        else:
            super().__init__("Tenant not found", "TENANT_NOT_FOUND")


class TenantAlreadyExistsError(TenantError):
    """Raised when tenant already exists."""

    def __init__(self, field: str, value: str):
        super().__init__(f"Tenant with {field} '{value}' already exists", "TENANT_EXISTS")


class TenantNotActiveError(TenantError):
    """Raised when tenant is not active."""

    def __init__(self, message: str = "Tenant is not active"):
        super().__init__(message, "TENANT_INACTIVE")


class TenantManagementService:
    """Production-level tenant management service"""

    def __init__(self, session: Session):
        self.session = session

    def create_tenant(self, tenant_data: TenantCreate) -> Tenant:
        """
        Create a new tenant.

        Args:
            tenant_data: Tenant creation data

        Returns:
            Created tenant object

        Raises:
            TenantAlreadyExistsError: Tenant domain already exists
        """
        # Check if domain already exists (if provided)
        if tenant_data.domain:
            existing = self.get_tenant_by_domain(tenant_data.domain)
            if existing:
                raise TenantAlreadyExistsError("domain", tenant_data.domain)

        tenant = Tenant(
            name=tenant_data.name.strip(),
            domain=tenant_data.domain.lower() if tenant_data.domain else None,
            status=tenant_data.status or "active"
        )

        self.session.add(tenant)

        try:
            self.session.commit()
            self.session.refresh(tenant)
            logger.info(f"Created new tenant: {tenant.name} (ID: {tenant.id})")
            return tenant
        except IntegrityError as exc:
            self.session.rollback()
            if "domain" in str(exc).lower():
                raise TenantAlreadyExistsError("domain", tenant_data.domain) from exc
            raise TenantError("Failed to create tenant", "TENANT_CREATION_ERROR") from exc

    def get_tenant_by_id(self, tenant_id: UUID) -> Optional[Tenant]:
        """
        Get tenant by ID.

        Args:
            tenant_id: Tenant ID

        Returns:
            Tenant object if found, None otherwise
        """
        result = self.session.execute(
            select(Tenant).where(Tenant.id == tenant_id)
        )
        return result.scalar_one_or_none()

    def get_tenant_by_domain(self, domain: str) -> Optional[Tenant]:
        """
        Get tenant by domain.

        Args:
            domain: Tenant domain

        Returns:
            Tenant object if found, None otherwise
        """
        result = self.session.execute(
            select(Tenant).where(Tenant.domain == domain.lower())
        )
        return result.scalar_one_or_none()

    def get_default_tenant(self) -> Optional[Tenant]:
        """
        Get the default tenant (first active tenant or create one if none exists).

        Returns:
            Default tenant object if found, None otherwise
        """
        # Try to find an existing tenant that could serve as default
        result = self.session.execute(
            select(Tenant).where(
                and_(
                    Tenant.status == "active",
                    Tenant.name.ilike("%default%") | Tenant.name.ilike("%store%")
                )
            ).order_by(Tenant.created_at.asc())
        )
        default_tenant = result.scalar_one_or_none()

        if default_tenant:
            return default_tenant

        # If no obvious default, get the first active tenant
        result = self.session.execute(
            select(Tenant).where(Tenant.status == "active").order_by(Tenant.created_at.asc())
        )
        return result.scalar_one_or_none()

    def update_tenant(
        self, tenant_id: UUID, tenant_data: TenantUpdate
    ) -> Optional[Tenant]:
        """
        Update tenant information.

        Args:
            tenant_id: Tenant ID to update
            tenant_data: Update data

        Returns:
            Updated tenant object if found, None otherwise

        Raises:
            TenantNotFoundError: Tenant not found
            TenantAlreadyExistsError: Domain already exists
        """
        tenant = self.get_tenant_by_id(tenant_id)
        if not tenant:
            raise TenantNotFoundError(tenant_id)

        # Check domain uniqueness if updating domain
        update_data = tenant_data.model_dump(exclude_unset=True)
        if "domain" in update_data and update_data["domain"]:
            existing = self.get_tenant_by_domain(update_data["domain"])
            if existing and existing.id != tenant_id:
                raise TenantAlreadyExistsError("domain", update_data["domain"])
            update_data["domain"] = update_data["domain"].lower()

        # Update fields
        for field, value in update_data.items():
            if hasattr(tenant, field):
                setattr(tenant, field, value)

        try:
            self.session.commit()
            self.session.refresh(tenant)
            logger.info(f"Updated tenant: {tenant.name} (ID: {tenant.id})")
            return tenant
        except IntegrityError as exc:
            self.session.rollback()
            if "domain" in str(exc).lower():
                raise TenantAlreadyExistsError("domain", update_data.get("domain", "")) from exc
            raise TenantError("Failed to update tenant", "TENANT_UPDATE_ERROR") from exc

    def deactivate_tenant(self, tenant_id: UUID) -> bool:
        """
        Deactivate a tenant (soft delete).

        Args:
            tenant_id: Tenant ID to deactivate

        Returns:
            True if deactivated, False if not found

        Raises:
            TenantNotFoundError: Tenant not found
        """
        tenant = self.get_tenant_by_id(tenant_id)
        if not tenant:
            raise TenantNotFoundError(tenant_id)

        tenant.status = "inactive"
        self.session.commit()
        logger.info(f"Deactivated tenant: {tenant.name} (ID: {tenant.id})")
        return True

    def get_all_tenants(self, include_inactive: bool = False) -> Sequence[Tenant]:
        """
        Get all tenants.

        Args:
            include_inactive: Whether to include inactive tenants

        Returns:
            List of tenant objects
        """
        statement = select(Tenant)
        if not include_inactive:
            statement = statement.where(Tenant.status == "active")

        statement = statement.order_by(Tenant.name.asc())

        result = self.session.execute(statement)
        return result.scalars().all()

    def get_active_tenants_count(self) -> int:
        """
        Get count of active tenants.

        Returns:
            Number of active tenants
        """
        result = self.session.execute(
            select(func.count(Tenant.id)).where(Tenant.status == "active")
        )
        return result.scalar()

    def get_tenant_statistics(self, tenant_id: UUID) -> Dict[str, Any]:
        """
        Get comprehensive statistics for a tenant.

        Args:
            tenant_id: Tenant ID

        Returns:
            Dictionary with tenant statistics

        Raises:
            TenantNotFoundError: Tenant not found
            TenantNotActiveError: Tenant not active
        """
        tenant = self.get_tenant_by_id(tenant_id)
        if not tenant:
            raise TenantNotFoundError(tenant_id)

        if tenant.status != "active":
            raise TenantNotActiveError()

        # Get counts for various entities
        user_count = self.session.execute(
            select(func.count(User.id)).where(User.tenant_id == tenant_id)
        )
        user_count = user_count.scalar()

        product_count = self.session.execute(
            select(func.count(Product.id)).where(Product.tenant_id == tenant_id)
        )
        product_count = product_count.scalar()

        customer_count = self.session.execute(
            select(func.count(Customer.id)).where(Customer.tenant_id == tenant_id)
        )
        customer_count = customer_count.scalar()

        sale_count = self.session.execute(
            select(func.count(Sale.id)).where(Sale.tenant_id == tenant_id)
        )
        sale_count = sale_count.scalar()

        # Get recent activity
        recent_sales = self.session.execute(
            select(Sale)
            .where(Sale.tenant_id == tenant_id)
            .order_by(Sale.created_at.desc())
            .limit(5)
        )
        recent_sales = recent_sales.scalars().all()

        return {
            "tenant": {
                "id": str(tenant.id),
                "name": tenant.name,
                "domain": tenant.domain,
                "status": tenant.status,
                "created_at": tenant.created_at
            },
            "statistics": {
                "users": {
                    "total": user_count,
                    "super_admins": self._get_user_count_by_role(tenant_id, "super_admin"),
                    "managers": self._get_user_count_by_role(tenant_id, "manager"),
                    "cashiers": self._get_user_count_by_role(tenant_id, "cashier")
                },
                "products": {
                    "total": product_count,
                    "active": self._get_product_count_by_status(tenant_id, "active"),
                    "low_stock": self._get_low_stock_products_count(tenant_id)
                },
                "customers": {
                    "total": customer_count
                },
                "sales": {
                    "total": sale_count,
                    "recent_count": len(recent_sales)
                }
            },
            "recent_sales": [
                {
                    "id": str(sale.id),
                    "invoice_no": sale.invoice_no,
                    "total": float(sale.total),
                    "created_at": sale.created_at
                }
                for sale in recent_sales
            ]
        }

    def _get_user_count_by_role(self, tenant_id: UUID, role: str) -> int:
        """Get user count by role for a tenant."""
        result = self.session.execute(
            select(func.count(User.id)).where(
                and_(User.tenant_id == tenant_id, User.role == role)
            )
        )
        return result.scalar()

    def _get_product_count_by_status(self, tenant_id: UUID, status: str) -> int:
        """Get product count by status for a tenant."""
        result = self.session.execute(
            select(func.count(Product.id)).where(
                and_(Product.tenant_id == tenant_id, Product.status == status)
            )
        )
        return result.scalar()

    def _get_low_stock_products_count(self, tenant_id: UUID, threshold: int = 10) -> int:
        """Get count of products with low stock for a tenant."""
        result = self.session.execute(
            select(func.count(Product.id)).where(
                and_(
                    Product.tenant_id == tenant_id,
                    Product.stock <= threshold,
                    Product.status == "active"
                )
            )
        )
        return result.scalar()
