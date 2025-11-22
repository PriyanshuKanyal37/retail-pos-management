from typing import Any

from sqlalchemy.orm import DeclarativeBase, Mapped, declared_attr


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    id: Mapped[Any]  # type: ignore[assignment]

    @declared_attr.directive
    def __tablename__(cls) -> str:  # type: ignore[misc]
        return cls.__name__.lower()
