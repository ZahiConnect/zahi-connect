"""Menu schemas — request/response models for categories and items."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Category ──

class MenuCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    sort_order: int = 0
    is_active: bool = True


class MenuCategoryResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    description: Optional[str] = None
    sort_order: int
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Menu Item ──

class MenuItemCreate(BaseModel):
    category_id: uuid.UUID
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    image_url: Optional[str] = None
    dine_in_price: float = Field(..., gt=0)
    delivery_price: Optional[float] = None
    prep_time_minutes: int = Field(default=15, ge=1)
    food_type: str = Field(default="veg", pattern=r"^(veg|non_veg)$")
    is_available: bool = True


class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    dine_in_price: Optional[float] = None
    delivery_price: Optional[float] = None
    prep_time_minutes: Optional[int] = None
    food_type: Optional[str] = None
    is_available: Optional[bool] = None
    category_id: Optional[uuid.UUID] = None


class MenuItemResponse(BaseModel):
    id: uuid.UUID
    category_id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    dine_in_price: float
    delivery_price: Optional[float] = None
    prep_time_minutes: int
    food_type: str
    is_available: bool
    created_at: datetime

    model_config = {"from_attributes": True}
