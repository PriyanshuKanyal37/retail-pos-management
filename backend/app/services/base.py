from typing import TypeVar, Type, Any, Dict
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.orm import DeclarativeBase, Session

# Generic type for model classes
ModelType = TypeVar("ModelType", bound=DeclarativeBase)


class TenantAwareService:
    """Base service that automatically filters by tenant_id"""

    def __init__(self, session: Session, tenant_id: UUID, model_class: Type[ModelType]):
        self.session = session
        self.tenant_id = tenant_id
        self.model_class = model_class

    def get_tenant_filter(self):
        """Returns filter condition for tenant_id"""
        return self.model_class.__table__.c.tenant_id == self.tenant_id

    def get_all(self):
        """Get all records for this tenant"""
        statement = select(self.model_class).where(self.get_tenant_filter())
        result = self.session.execute(statement)
        return result.scalars().all()

    def get_by_id(self, record_id: UUID):
        """Get record by ID for this tenant only"""
        statement = select(self.model_class).where(
            and_(
                self.get_tenant_filter(),
                self.model_class.id == record_id
            )
        )
        result = self.session.execute(statement)
        return result.scalars().first()

    def create(self, data: Dict[str, Any]):
        """Create new record with tenant_id automatically set"""
        # Ensure tenant_id is set
        data['tenant_id'] = self.tenant_id
        record = self.model_class(**data)
        self.session.add(record)
        self.session.commit()
        self.session.refresh(record)
        return record

    def update(self, record_id: UUID, data: Dict[str, Any]):
        """Update record for this tenant only"""
        record = self.get_by_id(record_id)
        if not record:
            return None

        # Don't allow changing tenant_id
        if 'tenant_id' in data:
            del data['tenant_id']

        for key, value in data.items():
            if hasattr(record, key):
                setattr(record, key, value)

        self.session.commit()
        self.session.refresh(record)
        return record

    def delete(self, record_id: UUID):
        """Delete record for this tenant only"""
        record = self.get_by_id(record_id)
        if not record:
            return False

        self.session.delete(record)
        self.session.commit()
        return True

    def count(self):
        """Count records for this tenant"""
        statement = select(self.model_class).where(self.get_tenant_filter())
        result = self.session.execute(statement)
        return len(result.scalars().all())
