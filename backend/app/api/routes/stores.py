from typing import Sequence
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.deps import (
    get_current_user,
    get_db_session,
    require_super_admin,
    require_manager,
    get_tenant_id,
    get_store_id,
)
from app.crud import crud_store
from app.models.user import User
from app.models.store import Store
from app.schemas.store import (
    StoreCreate,
    StoreUpdate,
    Store,
    StoreStats,
)

router = APIRouter(prefix="/stores", tags=["stores"])


@router.get("/", response_model=list[Store])
def get_stores(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status: str | None = Query(None),
) -> list[Store]:
    """
    Get stores based on user role:
    - Super Admin: All stores in tenant
    - Manager: All stores in tenant
    - Cashier: Their assigned store only
    """
    if current_user.role == "super_admin" or current_user.role == "manager":
        # Super admin and manager can see all stores
        stores = crud_store.get_multi(
            session,
            skip=skip,
            limit=limit,
            tenant_id=tenant_id,
            status=status,
        )
    else:
        # Cashier can only see their assigned store
        if not current_user.store_id:
            return []

        store = crud_store.get(
            session,
            id=current_user.store_id,
            tenant_id=tenant_id,
        )
        stores = [store] if store else []

    return stores


@router.get("/active", response_model=list[Store])
def get_active_stores(
    current_user: User = Depends(require_manager),
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
) -> list[Store]:
    """Get active stores (manager and super admin only)"""
    stores = crud_store.get_active_stores(
        session,
        tenant_id=tenant_id,
        skip=skip,
        limit=limit,
    )

    return stores


@router.get("/search", response_model=list[Store])
def search_stores(
    search_term: str = Query(..., min_length=1),
    current_user: User = Depends(require_manager),
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
) -> list[Store]:
    """Search stores by name or address (manager and super admin only)"""
    stores = crud_store.search_stores(
        session,
        search_term=search_term,
        tenant_id=tenant_id,
        skip=skip,
        limit=limit,
    )

    return stores


@router.get("/{store_id}", response_model=Store)
def get_store(
    store_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> Store:
    """
    Get store by ID based on user role:
    - Super Admin: Any store in tenant
    - Manager: Any store in tenant
    - Cashier: Their assigned store only
    """
    # Check access permissions
    if current_user.role == "cashier" and current_user.store_id != store_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only access your assigned store"
        )

    store = crud_store.get(
        session,
        id=store_id,
        tenant_id=tenant_id,
    )

    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )

    return store


@router.get("/{store_id}/stats", response_model=StoreStats)
def get_store_statistics(
    store_id: UUID,
    current_user: User = Depends(require_manager),
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> dict:
    """Get store statistics (manager and super admin only)"""
    # Verify store exists
    store =  crud_store.get(session, id=store_id, tenant_id=tenant_id)
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )

    stats =  crud_store.get_store_statistics(
        session,
        store_id=store_id,
        tenant_id=tenant_id,
    )

    return StoreStats.model_validate(stats)


@router.post("/", response_model=Store, status_code=status.HTTP_201_CREATED)
def create_store(
    store_data: StoreCreate,
    current_user: User = Depends(require_super_admin),
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> Store:
    """Create a new store (super admin only)"""
    # Check if store name already exists in tenant
    existing_store =  crud_store.get_by_name(
        session,
        name=store_data.name,
        tenant_id=tenant_id,
    )
    if existing_store:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Store with this name already exists"
        )

    # Create store data with tenant_id from current user's context
    store_dict = store_data.model_dump()
    store_dict["tenant_id"] = tenant_id

    try:
        store =  crud_store.create(
            session,
            obj_in=store_dict,
            tenant_id=tenant_id,
        )
        return store
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create store: {str(e)}"
        )


@router.patch("/{store_id}", response_model=Store)
def update_store(
    store_id: UUID,
    store_data: StoreUpdate,
    current_user: User = Depends(require_super_admin),
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> Store:
    """Update store (super admin only)"""
    store =  crud_store.get(session, id=store_id, tenant_id=tenant_id)
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )

    # Check if name conflict (if name is being updated)
    if store_data.name and store_data.name != store.name:
        existing_store =  crud_store.get_by_name(
            session,
            name=store_data.name,
            tenant_id=tenant_id,
        )
        if existing_store:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Store with this name already exists"
            )

    try:
        updated_store =  crud_store.update(
            session,
            db_obj=store,
            obj_in=store_data,
        )
        return updated_store
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update store: {str(e)}"
        )




@router.patch("/{store_id}/status")
def update_store_status(
    store_id: UUID,
    status: str,
    current_user: User = Depends(require_super_admin),
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> dict:
    """Update store status (super admin only)"""
    if status not in ["active", "inactive", "suspended"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid status. Must be one of: active, inactive, suspended"
        )

    store =  crud_store.update_status(
        session,
        store_id=store_id,
        status=status,
        tenant_id=tenant_id,
    )

    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )

    return {"message": "Store status updated successfully", "store_id": store_id, "status": status}


@router.delete("/{store_id}")
def delete_store(
    store_id: UUID,
    current_user: User = Depends(require_super_admin),
    session: Session = Depends(get_db_session),
    tenant_id: UUID = Depends(get_tenant_id),
) -> dict:
    """Delete a store (super admin only)"""
    # TODO: Add checks for existing data before deletion
    store =  crud_store.remove(
        session,
        id=store_id,
        tenant_id=tenant_id,
    )

    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Store not found"
        )

    return {"message": "Store deleted successfully", "store_id": store_id}
