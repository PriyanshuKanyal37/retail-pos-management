from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.api.deps import get_db_session, get_tenant_id
from app.schemas.tenant import UserCreate, UserResponse, LoginRequest, LoginResponse, TenantCreate
from app.services.tenant_auth import TenantAuthService
from app.services.tenant_management import TenantManagementService
from app.services.tenant_auth import AuthError

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/signup", response_model=dict, status_code=status.HTTP_201_CREATED)
@router.post("/signup/", response_model=dict, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def signup(
    user_data: UserCreate,
    session: AsyncSession = Depends(get_db_session),
):
    """Register a new user (signup)."""
    try:
        # Initialize services
        auth_service = TenantAuthService(session)
        tenant_service = TenantManagementService(session)

        # Restrict signup to super admins only
        if user_data.role.lower() != "super_admin":
            raise AuthError("Only super admin accounts can be created through signup. Managers and cashiers must be created by super admins.")

        # Create unique tenant for each super admin
        tenant_name = f"{user_data.name}'s Store"
        # Check if super admin with this email already exists
        existing_admin = await auth_service.get_user_by_email_for_tenant(user_data.email, None)
        if existing_admin:
            raise AuthError("Super admin with this email already exists")

        tenant_data = TenantCreate(name=tenant_name, domain=None)
        tenant = await tenant_service.create_tenant(tenant_data)

        # Create the user with tenant context
        login_response = await auth_service.register_user(
            user_data.email,
            user_data.password,
            user_data.name,
            "super_admin",  # Always create super_admin for signup
            tenant.id
        )

        return {
            "access_token": login_response.access_token,
            "token_type": login_response.token_type,
            "user": {
                "id": login_response.user.id,
                "email": login_response.user.email,
                "name": login_response.user.name,
                "role": login_response.user.role,
                "tenant_id": login_response.user.tenant_id,
                "store_id": login_response.user.store_id,
                "status": login_response.user.status
            },
            "tenant_id": str(tenant.id),
            "tenant_name": tenant.name,
            "message": "Account created successfully"
        }

    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {str(e)}"
        )


@router.post("/login", response_model=dict)
@router.post("/login/", response_model=dict, include_in_schema=False)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_db_session),
):
    try:
        # Initialize tenant auth service
        auth_service = TenantAuthService(session)

        # Authenticate user with tenant context
        login_response = await auth_service.authenticate_user(
            form_data.username,
            form_data.password
        )

        return {
            "access_token": login_response.access_token,
            "token_type": login_response.token_type,
            "user": {
                "id": login_response.user.id,
                "email": login_response.user.email,
                "name": login_response.user.name,
                "role": login_response.user.role,
                "tenant_id": login_response.user.tenant_id,
                "store_id": login_response.user.store_id,
                "status": login_response.user.status
            },
            "tenant_id": str(login_response.user.tenant_id),
            "message": "Login successful"
        }

    except AuthError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Login failed: {str(e)}"
        )
