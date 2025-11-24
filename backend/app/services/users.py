from typing import Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserRole, UserUpdate


class DuplicateEmailError(Exception):
    """Raised when attempting to create a user with an existing email."""


class InvalidManagerError(Exception):
    """Raised when cashier-manager relationships are invalid."""


def get_user_by_email(session: Session, email: str) -> User | None:
    result = session.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


def list_users(
    session: Session,
    tenant_id: UUID | None = None,
    store_id: UUID | None = None,
    role: str | None = None
) -> Sequence[User]:
    query = select(User)

    if tenant_id:
        query = query.where(User.tenant_id == tenant_id)

    if store_id:
        query = query.where(User.store_id == store_id)

    if role:
        query = query.where(User.role == role)

    query = query.order_by(User.created_at.desc())
    result = session.execute(query)
    return result.scalars().all()


def _get_admin_by_id(session: Session, admin_id: UUID) -> User:
    result = session.execute(select(User).where(User.id == admin_id))
    admin = result.scalar_one_or_none()
    if not admin or admin.role != UserRole.ADMIN:
        raise InvalidManagerError("Manager must reference an existing admin user")
    return admin


def create_user(session: Session, payload: UserCreate) -> User:
    role_value = payload.role.value if isinstance(payload.role, UserRole) else str(payload.role)
    status_value = payload.status.value if payload.status else "active"

    # Validate role-based assignments
    _validate_user_assignments(session, payload)

    user = User(
        tenant_id=payload.tenant_id,
        name=payload.name,
        email=payload.email.lower(),
        password_hash=get_password_hash(payload.password),
        role=role_value,
        status=status_value,
        store_id=payload.store_id,
    )
    session.add(user)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise DuplicateEmailError from exc
    session.refresh(user)
    return user


def update_user(session: Session, user_id: UUID, payload: UserUpdate) -> User | None:
    result = session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        return None

    if payload.name is not None:
        user.name = payload.name

    if payload.role is not None:
        role_value = payload.role.value if isinstance(payload.role, UserRole) else str(payload.role)
        user.role = role_value

    if payload.status is not None:
        user.status = payload.status

    if payload.store_id is not None:
        user.store_id = payload.store_id


    if payload.password:
        user.password_hash = get_password_hash(payload.password)

    # Validate role-based assignments
    _validate_user_updates(session, user_id, payload)

    session.commit()
    session.refresh(user)
    return user


def authenticate_user(session: Session, email: str, password: str) -> User | None:
    user = get_user_by_email(session, email)
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


def _validate_user_assignments(session: Session, payload: UserCreate) -> None:
    """Validate user role-based assignments during creation."""
    role_value = payload.role.value if isinstance(payload.role, UserRole) else str(payload.role)

    # Cashier must have store assigned
    if role_value == UserRole.CASHIER and not payload.store_id:
        raise InvalidManagerError("Cashier must be assigned to a store")

    # Super admin should not be assigned to a store
    if role_value == UserRole.SUPER_ADMIN and payload.store_id:
        raise InvalidManagerError("Super admin cannot be assigned to a specific store")


def _validate_user_updates(session: Session, user_id: UUID, payload: UserUpdate) -> None:
    """Validate user role-based assignments during updates."""
    # Get current user to check role changes
    result = session.execute(select(User).where(User.id == user_id))
    current_user = result.scalar_one_or_none()
    if not current_user:
        raise InvalidManagerError("User not found")

    # Validate role changes
    if payload.role is not None:
        new_role = payload.role.value if isinstance(payload.role, UserRole) else str(payload.role)

        # If changing to cashier, store assignment is required
        if new_role == UserRole.CASHIER and not payload.store_id and not current_user.store_id:
            raise InvalidManagerError("Cashier must be assigned to a store")

        # If changing to super admin, remove store assignment
        if new_role == UserRole.SUPER_ADMIN:
            if payload.store_id is not None:
                raise InvalidManagerError("Super admin cannot be assigned to a specific store")
            if current_user.store_id is not None:
                raise InvalidManagerError("Remove store assignment before promoting to super admin")

    # Validate store assignment exists
    if payload.store_id is not None:
        from app.models.store import Store
        store_result = session.execute(select(Store).where(Store.id == payload.store_id))
        if not store_result.scalar_one_or_none():
            raise InvalidManagerError("Assigned store does not exist")
