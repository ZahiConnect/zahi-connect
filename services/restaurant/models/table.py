"""
Zahi Connect - Table Model
Represents physical tables in the restaurant.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class Table(Base):
    __tablename__ = "tables"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    table_number = Column(Integer, nullable=False)
    capacity = Column(Integer, default=4)  # seats

    # Status: available, occupied, reserved
    status = Column(String(20), default="available")

    assigned_staff = Column(String(200), nullable=True)  # waiter name

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Table {self.table_number} - {self.status}>"
