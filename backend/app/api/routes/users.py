from typing import Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_user,
    get_db_session,
    require_admin,
    require_manager,
    require_super_admin,
    get_tenant_id,
    get_store_id,
)
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.services.users import (
    DuplicateEmailError,
    InvalidManagerError,
    create_user,
    list_users,
    update_user,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Get current logged-in user's profile."""
    return UserResponse.model_validate(current_user)


@router.get("/", response_model=list[UserResponse])
def get_users(
    current_user: User = Depends(require_manager),
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
    store_id: UUID | None = Query(None, description="Filter by store ID"),
    role: str | None = Query(None, description="Filter by role"),
) -> Sequence[User]:
    """
    Get users based on role:
    - Super Admin: All users in tenant
    - Manager: Users in their assigned stores
    """
    if current_user.role == "super_admin":
        # Super admin can see all users with optional filters
        return list_users(
            session,
            tenant_id=tenant_id,
            store_id=store_id,
            role=role,
        )
    elif current_user.role == "manager":
        # Manager can only see users in their assigned stores
        # For now, get all users in tenant and filter by manager's stores
        all_users = list_users(session, tenant_id=tenant_id, role=role)

        # Filter to show only cashiers assigned to this manager and the manager themselves
        filtered_users = [
            user for user in all_users
            if (user.role == "manager" and user.id == current_user.id) or
               (user.role == "cashier" and user.store_id == current_user.store_id)
        ]
        return filtered_users
    else:
        # Cashiers can only see themselves
        return [current_user]


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user_endpoint(
    payload: UserCreate,
    current_user: User = Depends(require_manager),
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
    store_id: UUID | None = Depends(get_store_id),
) -> User:
    """
    Create a user based on role:
    - Super Admin: Can create any user type
    - Manager: Can only create cashiers for their assigned stores
    """
    try:
        # Set tenant_id from current user's context
        payload.tenant_id = tenant_id

        # Role-based validation
        if current_user.role == "manager":
            # Managers can only create cashiers
            if payload.role != "cashier":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Managers can only create cashiers"
                )

            # Cashiers must be assigned to manager's store
            if not payload.store_id:
                if store_id:
                    payload.store_id = store_id
                else:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Store assignment required for cashier creation"
                    )

            # Assign the manager to the cashier

        elif current_user.role == "super_admin":
            # Super admin can create any user type, no additional restrictions
            pass

        return create_user(session, payload)
    except DuplicateEmailError:
        raise HTTPException(status_code=409, detail="Email already in use")
    except InvalidManagerError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.patch("/{user_id}", response_model=UserResponse)
def update_user_endpoint(
    user_id: UUID,
    payload: UserUpdate,
    current_user: User = Depends(require_manager),
    session: Session = Depends(get_db_session),
) -> User:
    """
    Update a user based on role:
    - Super Admin: Can update any user
    - Manager: Can only update cashiers assigned to them
    """
    try:
        # Role-based validation
        if current_user.role == "manager":
            # Get the user to be updated
            from app.crud.crud_user import crud_user
            target_user =  crud_user.get(session, id=user_id)

            if not target_user:
                raise HTTPException(status_code=404, detail="User not found")

            # Managers can only update their own cashiers or themselves
            if not (target_user.role == "cashier" and target_user.store_id == current_user.store_id) and \
               not (target_user.role == "manager" and target_user.id == current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update cashiers assigned to you or yourself"
                )

            # Managers cannot change cashier roles
            if payload.role and payload.role != "cashier":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You cannot change user roles"
                )

        user = update_user(session, user_id, payload)
    except InvalidManagerError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/store/{store_id}", response_model=list[UserResponse])
def get_users_by_store(
    store_id: UUID,
    current_user: User = Depends(require_manager),
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> Sequence[User]:
    """
    Get users for a specific store based on role:
    - Super Admin: Can see users for any store
    - Manager: Can see users only for their assigned stores
    """
    # Validate store access for managers
    if current_user.role == "manager":
        # Managers can only access users from their own store
        if store_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only access users from your assigned store"
            )

    return list_users(session, tenant_id=tenant_id, store_id=store_id)


@router.get("/managers", response_model=list[UserResponse])
def get_managers(
    current_user: User = Depends(require_super_admin),
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> Sequence[User]:
    """Get all managers for a tenant (super admin only)."""
    return list_users(session, tenant_id=tenant_id, role="manager")


@router.delete("/{user_id}", status_code=204)
def delete_user(
    user_id: UUID,
    current_user: User = Depends(require_manager),
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
):
    """
    Delete a user from the system (super admin and manager only).

    This endpoint permanently deletes a user from the database.
    - Super Admins can delete managers and cashiers (but not other Super Admins)
    - Managers can only delete cashiers assigned to their store
    The deletion cascades to related records like sessions.
    """
    # Import CRUD user
    from app.crud.crud_user import crud_user

    # Prevent deletion of Super Admins
    user_to_delete = crud_user.get(session, user_id)
    if not user_to_delete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if user_to_delete.tenant_id != tenant_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: User belongs to different tenant"
        )

    if user_to_delete.role == "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete Super Admin users"
        )

    # Role-based access control
    if current_user.role == "manager":
        # Managers can only delete cashiers
        if user_to_delete.role != "cashier":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Managers can only delete cashiers"
            )

        # Managers can only delete cashiers from their store
        if user_to_delete.store_id != current_user.store_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Managers can only delete cashiers from their assigned store"
            )
    elif current_user.role == "super_admin":
        # Super Admins cannot delete other Super Admins (already checked above)
        pass

    # Prevent users from deleting themselves
    if user_to_delete.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete your own account"
        )

    # Delete the user using CRUD remove method
    deleted_user = crud_user.remove(session, id=user_id, tenant_id=tenant_id)
    if not deleted_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete user"
        )

    return None
