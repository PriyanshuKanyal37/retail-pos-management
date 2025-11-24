from typing import Annotated, Tuple
from uuid import UUID

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_token, get_tenant_id_from_token
from app.db.session import AsyncSessionAdapter, SessionLocal
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_prefix}/auth/login")


async def get_db_session():
    db = SessionLocal()
    adapter = AsyncSessionAdapter(db)
    try:
        yield adapter
    finally:
        await adapter.close()


async def get_current_user_with_tenant(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Annotated[AsyncSession, Depends(get_db_session)],
) -> Tuple[User, UUID]:
    """Get current user and their tenant_id from JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        tenant_id = payload.get("tenant_id")

        if user_id is None or tenant_id is None:
            raise credentials_exception
    except (JWTError, ValueError):
        raise credentials_exception

    # Get user and verify tenant_id matches
    result = await session.execute(
        select(User).where(
            and_(
                User.id == UUID(user_id),
                User.tenant_id == UUID(tenant_id)
            )
        )
    )
    user = result.scalar_one_or_none()

    if user is None or user.status != "active":
        raise credentials_exception

    return user, UUID(tenant_id)


async def get_current_user(
    user_tenant: Annotated[Tuple[User, UUID], Depends(get_current_user_with_tenant)]
) -> User:
    """Dependency to get current user (backward compatibility)"""
    user, _ = user_tenant
    return user


async def get_tenant_id(
    user_tenant: Annotated[Tuple[User, UUID], Depends(get_current_user_with_tenant)]
) -> UUID:
    """Dependency to get tenant_id from authenticated user"""
    _, tenant_id = user_tenant
    return tenant_id


def require_super_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Require super admin role"""
    if user.role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin access required")
    return user


def require_admin(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Require admin role (legacy for backward compatibility)"""
    if user.role not in ["super_admin", "manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


def require_manager(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Require manager role or higher"""
    if user.role not in ["super_admin", "manager"]:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Manager access required")
    return user


async def get_store_id(
    current_user: Annotated[User, Depends(get_current_user)]
) -> UUID | None:
    """Get store_id from current user context"""
    return current_user.store_id


# Storage Service Dependencies
from app.services.storage_service import SupabaseStorageService
from app.services.product_service import ProductService
from app.services.sales_service import SalesService

async def get_storage_service() -> SupabaseStorageService:
    """Get storage service dependency"""
    return SupabaseStorageService()

async def get_product_service(
    db: AsyncSession = Depends(get_db_session),
    storage: SupabaseStorageService = Depends(get_storage_service)
) -> ProductService:
    """Get product service dependency"""
    return ProductService(db, storage)

async def get_sales_service(
    db: AsyncSession = Depends(get_db_session),
    storage: SupabaseStorageService = Depends(get_storage_service)
) -> SalesService:
    """Get sales service dependency"""
    return SalesService(db, storage)
