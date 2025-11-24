from typing import Optional, Tuple
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.models.tenant import Tenant
from app.core.security import verify_password, get_password_hash, create_access_token
from app.schemas.tenant import LoginRequest, LoginResponse, UserCreate


class AuthError(Exception):
    """Base class for authentication errors."""

    def __init__(self, message: str, code: str = "AUTH_ERROR"):
        self.message = message
        self.code = code
        super().__init__(self.message)


class InvalidCredentialsError(AuthError):
    """Raised when email/password combination is invalid."""

    def __init__(self, message: str = "Invalid email or password"):
        super().__init__(message, "INVALID_CREDENTIALS")


class InactiveUserError(AuthError):
    """Raised when user account is inactive."""

    def __init__(self, message: str = "User account is inactive"):
        super().__init__(message, "INACTIVE_USER")


class TenantNotFoundError(AuthError):
    """Raised when tenant is not found or inactive."""

    def __init__(self, message: str = "Tenant not found or inactive"):
        super().__init__(message, "TENANT_NOT_FOUND")


class UserTenantMismatchError(AuthError):
    """Raised when user doesn't belong to the specified tenant."""

    def __init__(self, message: str = "User does not belong to this tenant"):
        super().__init__(message, "USER_TENANT_MISMATCH")


class TenantAuthService:
    """Production-level authentication service with tenant context"""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def _execute_read(self, statement):
        """
        Execute a read-only statement with autocommit isolation so that
        PgBouncer session pooling doesn't terminate the connection.
        """
        conn = await self.session.connection(
            execution_options={"isolation_level": "AUTOCOMMIT"}
        )
        return await conn.execute(statement)

    async def _authenticate_user_internal(
        self, email: str, password: str, tenant_domain: Optional[str] = None
    ) -> Tuple[User, UUID]:
        """
        Internal method to authenticate user and validate tenant context.

        Args:
            email: User email
            password: Plain text password
            tenant_domain: Optional tenant domain for validation

        Returns:
            Tuple of (User, tenant_id)

        Raises:
            InvalidCredentialsError: Invalid email/password
            InactiveUserError: User account is inactive
            TenantNotFoundError: Tenant not found or inactive
            UserTenantMismatchError: User doesn't belong to tenant
        """
        # Find user with tenant information
        statement = (
            select(User, Tenant)
            .join(Tenant, User.tenant_id == Tenant.id)
            .where(
                and_(
                    User.email == email.lower(),
                    User.status == "active",
                    Tenant.status == "active"
                )
            )
        )

        if tenant_domain:
            statement = statement.where(Tenant.domain == tenant_domain.lower())

        result = await self._execute_read(statement)
        row = result.first()

        if not row:
            raise InvalidCredentialsError()

        # SQLAlchemy returns Row objects; unpack explicitly to avoid
        # "too many values to unpack" errors in PgBouncer-safe mode.
        user, tenant = row[0], row[1]

        # Verify password
        if not verify_password(password, user.password_hash):
            raise InvalidCredentialsError()

        return user, tenant.id

    async def login(
        self, login_request: LoginRequest, tenant_domain: Optional[str] = None
    ) -> LoginResponse:
        """
        Authenticate user and return access token with tenant context.

        Args:
            login_request: Login credentials
            tenant_domain: Optional tenant domain for multi-tenant login

        Returns:
            LoginResponse with access token and user info
        """
        try:
            user, tenant_id = await self._authenticate_user_internal(
                login_request.email, login_request.password, tenant_domain
            )
        except AuthError:
            # Re-raise auth errors as-is
            raise
        except Exception as exc:
            # Convert unexpected errors to authentication errors
            raise InvalidCredentialsError("Authentication failed") from exc

        # Create access token with tenant context
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email, "name": user.name, "role": user.role},
            tenant_id=tenant_id
        )

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "tenant_id": str(tenant_id),
                "store_id": str(user.store_id) if user.store_id else None,
                "status": user.status
            }
        )

    async def create_user_with_tenant(
        self,
        user_data: UserCreate,
        tenant_id: UUID,
        creator_role: str = "super_admin"
    ) -> User:
        """
        Create a new user within a specific tenant.

        Args:
            user_data: User creation data
            tenant_id: Tenant ID where user belongs
            creator_role: Role of the user creating this account

        Returns:
            Created user object

        Raises:
            IntegrityError: Email already exists within tenant
            TenantNotFoundError: Tenant doesn't exist or is inactive
        """
        # Verify tenant exists and is active
        tenant = await self._execute_read(
            select(Tenant).where(
                and_(
                    Tenant.id == tenant_id,
                    Tenant.status == "active"
                )
            )
        )
        tenant = tenant.scalar_one_or_none()

        if not tenant:
            raise TenantNotFoundError("Tenant not found or inactive")

        # Validate role hierarchy - only super admins can create other super admins
        if user_data.role == "super_admin" and creator_role != "super_admin":
            raise AuthError("Only super admins can create super admin users", "INSUFFICIENT_PERMISSIONS")

        # Hash password
        password_hash = get_password_hash(user_data.password)

        # Create user
        user = User(
            tenant_id=tenant_id,
            name=user_data.name,
            email=user_data.email.lower(),
            password_hash=password_hash,
            role=user_data.role,
            status="active"
        )

        self.session.add(user)

        try:
            await self.session.commit()
            await self.session.refresh(user)
            return user
        except IntegrityError as exc:
            await self.session.rollback()
            if "email" in str(exc).lower():
                raise AuthError("Email already exists within this tenant", "EMAIL_EXISTS")
            raise AuthError("Failed to create user", "USER_CREATION_ERROR") from exc

    async def register_user(
        self,
        email: str,
        password: str,
        name: str,
        role: str,
        tenant_id: UUID
    ) -> LoginResponse:
        """
        Register a new user and return login response.

        Args:
            email: User email
            password: Plain text password
            name: User full name
            role: User role (super_admin/manager/cashier)
            tenant_id: Tenant ID where user belongs

        Returns:
            LoginResponse with access token and user info

        Raises:
            AuthError: Registration failed
        """
        # Create user data
        user_data = UserCreate(
            email=email.lower().strip(),
            password=password,
            name=name.strip(),
            role=role.lower()
        )

        # Create user in tenant
        user = await self.create_user_with_tenant(user_data, tenant_id, "super_admin")

        # Create access token for the new user
        access_token = create_access_token(
            data={"sub": str(user.id), "email": user.email, "name": user.name, "role": user.role},
            tenant_id=tenant_id
        )

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "tenant_id": str(tenant_id),
                "store_id": str(user.store_id) if user.store_id else None,
                "status": user.status
            }
        )

    async def authenticate_user(
        self, email: str, password: str, tenant_domain: Optional[str] = None
    ) -> LoginResponse:
        """
        Authenticate user and return login response.

        Args:
            email: User email
            password: Plain text password
            tenant_domain: Optional tenant domain for validation

        Returns:
            LoginResponse with access token and user info

        Raises:
            InvalidCredentialsError: Invalid email/password
            InactiveUserError: User account is inactive
            TenantNotFoundError: Tenant not found or inactive
            UserTenantMismatchError: User doesn't belong to tenant
        """
        # Create login request
        login_request = LoginRequest(email=email, password=password, tenant_domain=tenant_domain)

        # Use existing login method
        return await self.login(login_request, tenant_domain)

    async def verify_user_belongs_to_tenant(
        self, user_id: UUID, tenant_id: UUID
    ) -> bool:
        """
        Verify that a user belongs to a specific tenant.

        Args:
            user_id: User ID to verify
            tenant_id: Tenant ID to verify against

        Returns:
            True if user belongs to tenant, False otherwise
        """
        result = await self._execute_read(
            select(User).where(
                and_(
                    User.id == user_id,
                    User.tenant_id == tenant_id,
                    User.status == "active"
                )
            )
        )
        return result.scalar_one_or_none() is not None

    async def get_user_by_email_for_tenant(
        self, email: str, tenant_id: Optional[UUID]
    ) -> Optional[User]:
        """
        Get user by email within a specific tenant or across all tenants.

        Args:
            email: User email
            tenant_id: Tenant ID (if None, searches across all tenants)

        Returns:
            User object if found, None otherwise
        """
        if tenant_id:
            # Search within specific tenant
            result = await self._execute_read(
                select(User).where(
                    and_(
                        User.email == email.lower(),
                        User.tenant_id == tenant_id,
                        User.status == "active"
                    )
                )
            )
        else:
            # Search across all tenants (for super admin registration check)
            result = await self._execute_read(
                select(User).where(
                    and_(
                        User.email == email.lower(),
                        User.role == "super_admin",
                        User.status == "active"
                    )
                )
            )
        return result.scalar_one_or_none()

    async def deactivate_user(
        self, user_id: UUID, tenant_id: UUID, deactivator_role: str
    ) -> bool:
        """
        Deactivate a user within a tenant.

        Args:
            user_id: User ID to deactivate
            tenant_id: Tenant ID
            deactivator_role: Role of user performing deactivation

        Returns:
            True if user was deactivated, False if not found

        Raises:
            AuthError: Insufficient permissions
        """
        user = await self._execute_read(
            select(User).where(
                and_(
                    User.id == user_id,
                    User.tenant_id == tenant_id
                )
            )
        )
        user = user.scalar_one_or_none()

        if not user:
            return False

        # Only super admins can deactivate other super admins
        if user.role == "super_admin" and deactivator_role != "super_admin":
            raise AuthError("Only super admins can deactivate super admin users", "INSUFFICIENT_PERMISSIONS")

        user.status = "inactive"
        await self.session.commit()
        return True
