from typing import Optional, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db_session, require_admin
from app.models.user import User
from app.schemas.tenant import (
    TenantCreate,
    TenantResponse,
    TenantUpdate,
    TenantUserCreate,
    TenantUserResponse,
    TenantStatisticsResponse
)
from app.services.tenant_management import (
    TenantManagementService,
    TenantNotFoundError,
    TenantAlreadyExistsError,
    TenantNotActiveError,
)
from app.services.tenant_auth import TenantAuthService, AuthError
from app.utils.error_handlers import handle_service_errors

router = APIRouter(prefix="/tenants", tags=["tenants"])


def get_tenant_service(session: AsyncSession = Depends(get_db_session)) -> TenantManagementService:
    """Dependency to get tenant management service."""
    return TenantManagementService(session)


def get_tenant_auth_service(session: AsyncSession = Depends(get_db_session)) -> TenantAuthService:
    """Dependency to get tenant auth service."""
    return TenantAuthService(session)


@router.post("/", response_model=TenantResponse, status_code=201)
@handle_service_errors
async def create_tenant(
    tenant_data: TenantCreate,
    service: TenantManagementService = Depends(get_tenant_service),
    current_user: User = Depends(require_admin),  # Only super admins can create tenants
) -> TenantResponse:
    """
    Create a new tenant.

    Only system administrators can create new tenants. This creates the tenant
    organization and prepares it for user registration.
    """
    tenant = await service.create_tenant(tenant_data)

    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        domain=tenant.domain,
        status=tenant.status,
        created_at=tenant.created_at,
    )


@router.get("/", response_model=List[TenantResponse])
@handle_service_errors
async def get_tenants(
    include_inactive: bool = Query(False, description="Include inactive tenants"),
    service: TenantManagementService = Depends(get_tenant_service),
    current_user: User = Depends(require_admin),  # Only admins can view all tenants
) -> List[TenantResponse]:
    """
    Get all tenants.

    System administrators can view all tenants in the system.
    """
    tenants = await service.get_all_tenants(include_inactive)

    return [
        TenantResponse(
            id=tenant.id,
            name=tenant.name,
            domain=tenant.domain,
            status=tenant.status,
            created_at=tenant.created_at,
        )
        for tenant in tenants
    ]


@router.get("/{tenant_id}", response_model=TenantResponse)
@handle_service_errors
async def get_tenant(
    tenant_id: UUID,
    service: TenantManagementService = Depends(get_tenant_service),
    current_user: User = Depends(require_admin),  # Only admins can view tenant details
) -> TenantResponse:
    """
    Get tenant details by ID.

    System administrators can view detailed information about any tenant.
    """
    tenant = await service.get_tenant_by_id(tenant_id)

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        domain=tenant.domain,
        status=tenant.status,
        created_at=tenant.created_at,
    )


@router.patch("/{tenant_id}", response_model=TenantResponse)
@handle_service_errors
async def update_tenant(
    tenant_id: UUID,
    tenant_data: TenantUpdate,
    service: TenantManagementService = Depends(get_tenant_service),
    current_user: User = Depends(require_admin),  # Only admins can update tenants
) -> TenantResponse:
    """
    Update tenant information.

    System administrators can modify tenant details such as name,
    domain, and status.
    """
    tenant = await service.update_tenant(tenant_id, tenant_data)

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    return TenantResponse(
        id=tenant.id,
        name=tenant.name,
        domain=tenant.domain,
        status=tenant.status,
        created_at=tenant.created_at,
    )


@router.delete("/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
@handle_service_errors
async def delete_tenant(
    tenant_id: UUID,
    service: TenantManagementService = Depends(get_tenant_service),
    current_user: User = Depends(require_admin),  # Only admins can deactivate tenants
):
    """
    Deactivate a tenant (soft delete).

    This deactivates the tenant but preserves all data for compliance
    and potential reactivation.
    """
    await service.deactivate_tenant(tenant_id)


@router.get("/{tenant_id}/statistics", response_model=TenantStatisticsResponse)
@handle_service_errors
async def get_tenant_statistics(
    tenant_id: UUID,
    service: TenantManagementService = Depends(get_tenant_service),
    current_user: User = Depends(require_admin),  # Only admins can view tenant statistics
):
    """
    Get comprehensive statistics for a tenant.

    Provides detailed analytics including user counts, product inventory,
    customer data, and sales information for the specified tenant.
    """
    try:
        statistics = await service.get_tenant_statistics(tenant_id)
        return statistics
    except TenantNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )
    except TenantNotActiveError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tenant is not active"
        )


@router.post("/{tenant_id}/users", response_model=TenantUserResponse, status_code=201)
@handle_service_errors
async def create_tenant_user(
    tenant_id: UUID,
    user_data: TenantUserCreate,
    auth_service: TenantAuthService = Depends(get_tenant_auth_service),
    current_user: User = Depends(require_admin),  # Only admins can create users
) -> TenantUserResponse:
    """
    Create a new user within a specific tenant.

    System administrators can create users for any tenant. The user
    will be automatically associated with the specified tenant.
    """
    # Validate tenant exists and is active
    tenant_service = TenantManagementService(auth_service.session)
    tenant = await tenant_service.get_tenant_by_id(tenant_id)

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    if tenant.status != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot create users for inactive tenants"
        )

    user = await auth_service.create_user_with_tenant(
        user_data.user,
        tenant_id,
        current_user.role
    )

    return TenantUserResponse(
        id=user.id,
        tenant_id=user.tenant_id,
        name=user.name,
        email=user.email,
        role=user.role,
        status=user.status,
        created_at=user.created_at
    )


@router.get("/{tenant_id}/users", response_model=List[TenantUserResponse])
@handle_service_errors
async def get_tenant_users(
    tenant_id: UUID,
    session: AsyncSession = Depends(get_db_session),
    current_user: User = Depends(require_admin),  # Only admins can view tenant users
) -> List[TenantUserResponse]:
    """
    Get all users within a specific tenant.

    System administrators can view all users for any tenant.
    """
    # Validate tenant exists
    tenant_service = TenantManagementService(session)
    tenant = await tenant_service.get_tenant_by_id(tenant_id)

    if not tenant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tenant not found"
        )

    # Get users for this tenant
    from sqlalchemy import select
    from app.models.user import User

    result = await session.execute(
        select(User).where(User.tenant_id == tenant_id).order_by(User.name.asc())
    )
    users = result.scalars().all()

    return [
        TenantUserResponse(
            id=user.id,
            tenant_id=user.tenant_id,
            name=user.name,
            email=user.email,
            role=user.role,
            status=user.status,
            created_at=user.created_at
        )
        for user in users
    ]


@router.get("/count/active")
@handle_service_errors
async def get_active_tenants_count(
    service: TenantManagementService = Depends(get_tenant_service),
    current_user: User = Depends(require_admin),  # Only admins can view tenant counts
) -> dict:
    """
    Get count of active tenants.

    System administrators can monitor the number of active tenants
    in the system.
    """
    count = await service.get_active_tenants_count()
    return {"active_tenants": count}