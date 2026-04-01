"""
Zahi Connect - Menu Models
MenuCategory: Starters, Main Course, Drinks, Desserts
MenuItem: Individual food items with pricing, availability, prep time
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.orm import relationship
from sqlalchemy.types import JSON

from database import Base


class MenuCategory(Base):
    __tablename__ = "menu_categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    items = relationship("MenuItem", back_populates="category", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<MenuCategory {self.name}>"


class MenuItem(Base):
    __tablename__ = "menu_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id = Column(
        UUID(as_uuid=True), ForeignKey("menu_categories.id", ondelete="CASCADE"), nullable=False
    )
    tenant_id = Column(UUID(as_uuid=True), nullable=False, index=True)

    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    image_urls = Column(MutableList.as_mutable(JSON), nullable=False, default=list)

    dine_in_price = Column(Numeric(10, 2), nullable=False)
    delivery_price = Column(Numeric(10, 2), nullable=True)

    prep_time_minutes = Column(Integer, default=15)
    food_type = Column(String(10), default="veg")
    is_available = Column(Boolean, default=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    category = relationship("MenuCategory", back_populates="items")

    def sync_primary_image(self):
        cleaned_urls = [url for url in (self.image_urls or []) if url]
        self.image_urls = cleaned_urls
        self.image_url = cleaned_urls[0] if cleaned_urls else None

    def __repr__(self):
        return f"<MenuItem {self.name} Rs {self.dine_in_price}>"
