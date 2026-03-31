"""Inventory schemas."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class InventoryItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    quantity: float = Field(default=0, ge=0)
    unit: str = Field(default="kg", pattern=r"^(kg|litres|pieces|grams|ml)$")
    low_stock_threshold: float = Field(default=2, ge=0)


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    quantity: Optional[float] = None
    unit: Optional[str] = None
    low_stock_threshold: Optional[float] = None


class InventoryItemResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    quantity: float
    unit: str
    low_stock_threshold: float
    is_low_stock: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, item):
        return cls(
            id=item.id,
            tenant_id=item.tenant_id,
            name=item.name,
            quantity=float(item.quantity),
            unit=item.unit,
            low_stock_threshold=float(item.low_stock_threshold),
            is_low_stock=float(item.quantity) <= float(item.low_stock_threshold),
            created_at=item.created_at,
        )
