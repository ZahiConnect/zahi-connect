"""Inventory models for ingredient and supplier tracking."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, Numeric, String
from sqlalchemy.dialects.postgresql import UUID

from database import Base


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False, default="General")
    supplier = Column(String(200), nullable=True)

    quantity = Column(Numeric(10, 2), default=0)
    unit = Column(String(20), default="kg")
    low_stock_threshold = Column(Numeric(10, 2), default=2)
    unit_cost = Column(Numeric(10, 2), default=0)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<Inventory {self.name}: {self.quantity} {self.unit}>"
