"""
Zahi Connect - Order Models
Order: The main order (who, where, what status)
OrderItem: Individual items in the order with quantity and price
"""

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
    table_id = Column(UUID(as_uuid=True), ForeignKey("tables.id"), nullable=True)

    # Order source
    order_type = Column(String(20), default="dine_in")
    # Types: dine_in, delivery, whatsapp, website

    # Status lifecycle: new → preparing → ready → completed / cancelled
    status = Column(String(20), default="new", index=True)

    # Customer info (for delivery/WhatsApp orders)
    customer_name = Column(String(200), nullable=True)
    customer_phone = Column(String(15), nullable=True)
    delivery_address = Column(Text, nullable=True)

    # Totals
    total_amount = Column(Numeric(10, 2), default=0)
    special_instructions = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Order {self.id} - {self.status}>"


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(
        UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False
    )
    menu_item_id = Column(UUID(as_uuid=True), nullable=False)

    item_name = Column(String(200), nullable=False)  # Snapshot name at order time
    quantity = Column(Integer, nullable=False, default=1)
    unit_price = Column(Numeric(10, 2), nullable=False)
    special_instructions = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    order = relationship("Order", back_populates="items")

    def __repr__(self):
        return f"<OrderItem {self.item_name} x{self.quantity}>"
