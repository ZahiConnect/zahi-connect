"""Restaurant profile settings stored per tenant."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.mutable import MutableList
from sqlalchemy.types import JSON

from database import Base


class RestaurantProfile(Base):
    __tablename__ = "restaurant_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), nullable=False, unique=True, index=True)

    tagline = Column(String(160), nullable=True)
    description = Column(Text, nullable=True)

    area_name = Column(String(120), nullable=True)
    city = Column(String(120), nullable=True)
    state = Column(String(120), nullable=True)
    postal_code = Column(String(20), nullable=True)
    map_link = Column(String(500), nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    contact_email = Column(String(255), nullable=True)
    reservation_phone = Column(String(20), nullable=True)
    whatsapp_number = Column(String(20), nullable=True)

    cuisine_tags = Column(MutableList.as_mutable(JSON), nullable=False, default=list)
    service_modes = Column(MutableList.as_mutable(JSON), nullable=False, default=list)
    opening_time = Column(String(10), nullable=True)
    closing_time = Column(String(10), nullable=True)
    average_prep_minutes = Column(Integer, nullable=True)
    seating_capacity = Column(Integer, nullable=True)
    price_band = Column(String(30), nullable=True)
    accepts_reservations = Column(Boolean, nullable=False, default=True)

    cover_image_url = Column(String(500), nullable=True)
    gallery_image_urls = Column(MutableList.as_mutable(JSON), nullable=False, default=list)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<RestaurantProfile tenant={self.tenant_id}>"
