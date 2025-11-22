from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db_session, require_admin, get_tenant_id
from app.models.user import User
from app.schemas.setting import SettingResponse, SettingUpdate
from app.services.settings import get_settings, update_settings

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("/", response_model=SettingResponse)
async def read_settings(
    _: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    tenant_id: str = Depends(get_tenant_id),
) -> SettingResponse:
    setting = await get_settings(session, tenant_id)
    if setting is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to load settings for this tenant"
        )
    return SettingResponse.model_validate(setting)


@router.patch("/", response_model=SettingResponse)
async def patch_settings(
    payload: SettingUpdate,
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_db_session),
    tenant_id: str = Depends(get_tenant_id),
) -> SettingResponse:
    updated = await update_settings(session, payload, tenant_id)
    return SettingResponse.model_validate(updated)
