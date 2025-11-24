import logging
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.setting import Setting
from app.schemas.setting import SettingUpdate

logger = logging.getLogger(__name__)


def get_settings(session: Session, tenant_id: UUID) -> Setting | None:
    result = session.execute(select(Setting).where(Setting.tenant_id == tenant_id))
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
        session.commit()
        session.refresh(setting)
        return setting
    except IntegrityError:
        # Another request likely created the record first. Fetch the existing one.
        session.rollback()
        result = session.execute(select(Setting).where(Setting.tenant_id == tenant_id))
        return result.scalar_one_or_none()
    except Exception as exc:
        session.rollback()
        logger.exception("Failed to initialize settings for tenant %s", tenant_id, exc_info=exc)
        raise


def update_settings(session: Session, payload: SettingUpdate, tenant_id: UUID) -> Setting:
    setting = get_settings(session, tenant_id)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(setting, key, value)

    session.commit()
    session.refresh(setting)
    return setting
