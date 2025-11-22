import logging
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.setting import Setting
from app.schemas.setting import SettingUpdate

logger = logging.getLogger(__name__)


async def get_settings(session: AsyncSession, tenant_id: UUID) -> Setting | None:
    result = await session.execute(select(Setting).where(Setting.tenant_id == tenant_id))
    setting = result.scalar_one_or_none()
    if setting is not None:
        return setting

    # Initialize default settings for this tenant
    setting = Setting(
        id=uuid4(),
        tenant_id=tenant_id,
        store_name="My POS Store",
    )
    session.add(setting)
    try:
        await session.commit()
        await session.refresh(setting)
        return setting
    except IntegrityError:
        # Another request likely created the record first. Fetch the existing one.
        await session.rollback()
        result = await session.execute(select(Setting).where(Setting.tenant_id == tenant_id))
        return result.scalar_one_or_none()
    except Exception as exc:
        await session.rollback()
        logger.exception("Failed to initialize settings for tenant %s", tenant_id, exc_info=exc)
        raise


async def update_settings(session: AsyncSession, payload: SettingUpdate, tenant_id: UUID) -> Setting:
    setting = await get_settings(session, tenant_id)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(setting, key, value)

    await session.commit()
    await session.refresh(setting)
    return setting
