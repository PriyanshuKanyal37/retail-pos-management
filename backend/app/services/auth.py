from datetime import timedelta
from uuid import UUID

from app.core.config import settings
from app.core.security import create_access_token


def create_user_token(user_id: UUID, role: str) -> str:
    expires = timedelta(minutes=settings.access_token_expire_minutes)
    payload = {"sub": str(user_id), "role": role}
    return create_access_token(payload, expires)
