"""Schemas for restaurant workspace settings."""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class RestaurantTenantSnapshot(BaseModel):
    id: uuid.UUID
    slug: str
    business_type: str
    name: str
    email: str
    phone: str | None = None
    address: str | None = None


class RestaurantGeneralSettingsUpdate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: str = Field(..., min_length=3, max_length=255)
    phone: str | None = Field(default=None, max_length=20)
    address: str | None = Field(default=None, max_length=500)
    tagline: str | None = Field(default=None, max_length=160)
    description: str | None = Field(default=None, max_length=2000)
    area_name: str | None = Field(default=None, max_length=120)
    city: str | None = Field(default=None, max_length=120)
    state: str | None = Field(default=None, max_length=120)
    postal_code: str | None = Field(default=None, max_length=20)
    map_link: str | None = Field(default=None, max_length=500)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    contact_email: str | None = Field(default=None, max_length=255)
    reservation_phone: str | None = Field(default=None, max_length=20)
    whatsapp_number: str | None = Field(default=None, max_length=20)


class RestaurantOperationsSettingsUpdate(BaseModel):
    service_modes: list[str] = Field(default_factory=list)
    cuisine_tags: list[str] = Field(default_factory=list)
    opening_time: str | None = Field(default=None, max_length=10)
    closing_time: str | None = Field(default=None, max_length=10)
    average_prep_minutes: int | None = Field(default=None, ge=1, le=240)
    seating_capacity: int | None = Field(default=None, ge=1, le=1000)
    price_band: str | None = Field(default=None, pattern=r"^(budget|mid_range|premium)$")
    accepts_reservations: bool = True


class RestaurantProfileSettingsResponse(BaseModel):
    id: uuid.UUID | None = None
    tenant_id: uuid.UUID
    tagline: str | None = None
    description: str | None = None
    area_name: str | None = None
    city: str | None = None
    state: str | None = None
    postal_code: str | None = None
    map_link: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    contact_email: str | None = None
    reservation_phone: str | None = None
    whatsapp_number: str | None = None
    cuisine_tags: list[str] = Field(default_factory=list)
    service_modes: list[str] = Field(default_factory=list)
    opening_time: str | None = None
    closing_time: str | None = None
    average_prep_minutes: int | None = None
    seating_capacity: int | None = None
    price_band: str | None = None
    accepts_reservations: bool = True
    cover_image_url: str | None = None
    gallery_image_urls: list[str] = Field(default_factory=list)
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class RestaurantSettingsResponse(BaseModel):
    tenant: RestaurantTenantSnapshot
    profile: RestaurantProfileSettingsResponse


class RestaurantCoverImageUpdate(BaseModel):
    image_url: str = Field(..., min_length=5, max_length=500)
