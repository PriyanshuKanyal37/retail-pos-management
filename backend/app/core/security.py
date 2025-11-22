from datetime import datetime, timedelta
from typing import Any, Dict, Optional
from uuid import UUID

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None,
    tenant_id: Optional[UUID] = None
) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))

    # Add tenant_id to token if provided
    token_data = {"exp": expire}
    if tenant_id:
        token_data["tenant_id"] = str(tenant_id)

    to_encode.update(token_data)
    encoded_jwt = jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return encoded_jwt


def decode_token(token: str) -> Dict[str, Any]:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError as exc:
        raise ValueError("Token validation failed") from exc


def get_tenant_id_from_token(token: str) -> Optional[UUID]:
    """Extract tenant_id from JWT token"""
    try:
        payload = decode_token(token)
        tenant_id = payload.get("tenant_id")
        return UUID(tenant_id) if tenant_id else None
    except (JWTError, ValueError, TypeError):
        return None

