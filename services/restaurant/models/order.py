"""Order models for restaurant order lifecycle management."""

import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    table_id = Column(
        UUID(as_uuid=True), ForeignKey("tables.id", ondelete="SET NULL"), nullable=True
    )

    order_type = Column(String(20), default="dine_in")
    status = Column(String(20), default="new", index=True)

    customer_name = Column(String(200), nullable=True)
    customer_phone = Column(String(15), nullable=True)
    delivery_address = Column(Text, nullable=True)

    total_amount = Column(Numeric(10, 2), default=0)
    special_instructions = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    table = relationship("Table", back_populates="orders")

    @property
    def table_number(self):
        return self.table.table_number if self.table else None

    @property
    def item_count(self):
        return sum(item.quantity for item in self.items)

    def __repr__(self):
        return f"<Order {self.id} - {self.status}>"


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    menu_item_id = Column(UUID(as_uuid=True), nullable=False)

    item_name = Column(String(200), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(10, 2), nullable=False)
    special_instructions = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="items")

    @property
    def line_total(self):
        return float(self.unit_price) * self.quantity

    def __repr__(self):
        return f"<OrderItem {self.item_name} x{self.quantity}>"
