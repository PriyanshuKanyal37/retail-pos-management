"""
CRUD operations for User model.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session

from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash, verify_password


class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    """
    CRUD operations for User model with multi-tenant support.
    """

    def get_by_email(
        self,
        db: Session,
        *,
        email: str,
        tenant_id: Optional[UUID] = None
    ) -> Optional[User]:
        """
        Get a user by email with optional tenant filtering.

        Args:
            db: Database session
            email: User email
            tenant_id: Optional tenant ID for multi-tenant isolation

        Returns:
            User instance or None if not found
        """
        query = select(User).where(User.email == email)

        if tenant_id:
            query = query.where(User.tenant_id == tenant_id)

        result =  db.execute(query)
        return result.scalar_one_or_none()

    def authenticate(
        self,
        db: Session,
        *,
        email: str,
        password: str,
        tenant_id: Optional[UUID] = None
    ) -> Optional[User]:
        """
        Authenticate a user by email and password.

        Args:
            db: Database session
            email: User email
            password: User password
            tenant_id: Optional tenant ID for multi-tenant isolation

        Returns:
            User instance if authentication successful, None otherwise
        """
        user =  self.get_by_email(db, email=email, tenant_id=tenant_id)
        if not user:
            return None

        if not verify_password(password, user.password_hash):
            return None

        return user

    def create(
        self,
        db: Session,
        *,
        obj_in: UserCreate,
        tenant_id: UUID
    ) -> User:
        """
        Create a new user with password hashing.

        Args:
            db: Database session
            obj_in: User creation data
            tenant_id: Tenant ID

        Returns:
            Created user instance
        """
        # Hash the password
        password_hash = get_password_hash(obj_in.password)

        # Create user data
        user_data = obj_in.dict()
        user_data.pop("password")  # Remove plain text password
        user_data["password_hash"] = password_hash
        user_data["tenant_id"] = tenant_id

        # Set default status if not provided
        if not user_data.get("status"):
            user_data["status"] = "active"

        db_obj = User(**user_data)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def update(
        self,
        db: Session,
        *,
        db_obj: User,
        obj_in: UserUpdate
    ) -> User:
        """
        Update a user, hashing password if provided.

        Args:
            db: Database session
            db_obj: Existing user instance
            obj_in: User update data

        Returns:
            Updated user instance
        """
        update_data = obj_in.dict(exclude_unset=True)

        # Hash password if provided
        if "password" in update_data:
            hashed_password = get_password_hash(update_data["password"])
            update_data["password_hash"] = hashed_password
            del update_data["password"]

        return super().update(db, db_obj=db_obj, obj_in=update_data)

    def get_users_by_role(
        self,
        db: Session,
        *,
        role: str,
        tenant_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """
        Get users by role.

        Args:
            db: Database session
            role: User role (super_admin, manager, cashier)
            tenant_id: Optional tenant ID for multi-tenant isolation
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of user instances
        """
        query = select(User).where(User.role == role)

        if tenant_id:
            query = query.where(User.tenant_id == tenant_id)

        query = query.offset(skip).limit(limit).order_by(User.created_at.desc())
        result =  db.execute(query)
        return result.scalars().all()

    def get_active_users(
        self,
        db: Session,
        *,
        tenant_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """
        Get active users.

        Args:
            db: Database session
            tenant_id: Optional tenant ID for multi-tenant isolation
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of active user instances
        """
        query = select(User).where(User.status == "active")

        if tenant_id:
            query = query.where(User.tenant_id == tenant_id)

        query = query.offset(skip).limit(limit).order_by(User.created_at.desc())
        result =  db.execute(query)
        return result.scalars().all()

    def search_users(
        self,
        db: Session,
        *,
        search_term: str,
        tenant_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[User]:
        """
        Search users by name or email.

        Args:
            db: Database session
            search_term: Search term
            tenant_id: Optional tenant ID for multi-tenant isolation
            skip: Number of records to skip
            limit: Maximum number of records to return

        Returns:
            List of matching user instances
        """
        search_pattern = f"%{search_term}%"
        query = select(User).where(
            and_(
                User.name.ilike(search_pattern) | User.email.ilike(search_pattern)
            )
        )

        if tenant_id:
            query = query.where(User.tenant_id == tenant_id)

        query = query.offset(skip).limit(limit).order_by(User.created_at.desc())
        result =  db.execute(query)
        return result.scalars().all()

    def email_exists(
        self,
        db: Session,
        *,
        email: str,
        tenant_id: Optional[UUID] = None,
        exclude_user_id: Optional[UUID] = None
    ) -> bool:
        """
        Check if email exists for a user (excluding a specific user if provided).

        Args:
            db: Database session
            email: Email to check
            tenant_id: Optional tenant ID for multi-tenant isolation
            exclude_user_id: User ID to exclude from check

        Returns:
            True if email exists, False otherwise
        """
        query = select(func.count(User.id)).where(User.email == email)

        if tenant_id:
            query = query.where(User.tenant_id == tenant_id)

        if exclude_user_id:
            query = query.where(User.id != exclude_user_id)

        result =  db.execute(query)
        count = result.scalar()
        return count > 0

    def get_user_statistics(
        self,
        db: Session,
        *,
        tenant_id: Optional[UUID] = None
    ) -> dict:
        """
        Get user statistics for a tenant.

        Args:
            db: Database session
            tenant_id: Tenant ID

        Returns:
            Dictionary with user statistics
        """
        query = select(User).where(User.tenant_id == tenant_id) if tenant_id else select(User)

        # Total users
        total_query = select(func.count(User.id))
        if tenant_id:
            total_query = total_query.where(User.tenant_id == tenant_id)

        total_result =  db.execute(total_query)
        total_users = total_result.scalar() or 0

        # Active users
        active_query = select(func.count(User.id)).where(User.status == "active")
        if tenant_id:
            active_query = active_query.where(User.tenant_id == tenant_id)

        active_result =  db.execute(active_query)
        active_users = active_result.scalar() or 0

        # Super Admin users
        admin_query = select(func.count(User.id)).where(User.role == "super_admin")
        if tenant_id:
            admin_query = admin_query.where(User.tenant_id == tenant_id)

        admin_result =  db.execute(admin_query)
        admin_users = admin_result.scalar() or 0

        # Manager users
        manager_query = select(func.count(User.id)).where(User.role == "manager")
        if tenant_id:
            manager_query = manager_query.where(User.tenant_id == tenant_id)

        manager_result =  db.execute(manager_query)
        manager_users = manager_result.scalar() or 0

        # Cashier users
        cashier_query = select(func.count(User.id)).where(User.role == "cashier")
        if tenant_id:
            cashier_query = cashier_query.where(User.tenant_id == tenant_id)

        cashier_result =  db.execute(cashier_query)
        cashier_users = cashier_result.scalar() or 0

        return {
            "total_users": total_users,
            "active_users": active_users,
            "inactive_users": total_users - active_users,
            "super_admin_users": admin_users,
            "manager_users": manager_users,
            "cashier_users": cashier_users,
        }


# Create a singleton instance
crud_user = CRUDUser(User)
