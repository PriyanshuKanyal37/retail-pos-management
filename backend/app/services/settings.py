import logging
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.setting import Setting
from app.schemas.setting import SettingUpdate

logger = logging.getLogger(__name__)


def _load_settings_records(session: Session, tenant_id: UUID) -> list[Setting]:
    statement = (
        select(Setting)
        .where(Setting.tenant_id == tenant_id)
        .order_by(
            Setting.updated_at.desc().nulls_last(),
            Setting.created_at.desc()
        )
    )
    result = session.execute(statement)
    return result.scalars().all()


def _ensure_single_record(session: Session, tenant_id: UUID, records: list[Setting]) -> Setting | None:
    if not records:
        return None

    primary = records[0]
    if len(records) == 1:
        return primary

    duplicates = records[1:]
    duplicate_ids = [str(rec.id) for rec in duplicates]
    logger.warning(
        "Detected %s duplicate settings rows for tenant %s. "
        "Keeping most recent record %s and removing duplicates %s",
        len(duplicates),
        tenant_id,
        primary.id,
        duplicate_ids,
    )

    for record in duplicates:
        session.delete(record)

    try:
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        logger.exception("Failed deleting duplicate settings rows for tenant %s", tenant_id)
        raise
    else:
        session.refresh(primary)

    return primary


def get_settings(session: Session, tenant_id: UUID) -> Setting | None:
    existing_records = _load_settings_records(session, tenant_id)
    setting = _ensure_single_record(session, tenant_id, existing_records)
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
        records = _load_settings_records(session, tenant_id)
        return records[0] if records else None
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
