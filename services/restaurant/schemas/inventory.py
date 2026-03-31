"""Inventory schemas."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


UNIT_PATTERN = r"^(kg|grams|litres|ml|pieces|boxes|bottles)$"


class InventoryItemCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    category: str = Field(default="General", min_length=1, max_length=100)
    supplier: Optional[str] = Field(default=None, max_length=200)
    quantity: float = Field(default=0, ge=0)
    unit: str = Field(default="kg", pattern=UNIT_PATTERN)
    low_stock_threshold: float = Field(default=2, ge=0)
    unit_cost: float = Field(default=0, ge=0)


class InventoryItemUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    supplier: Optional[str] = Field(default=None, max_length=200)
    quantity: Optional[float] = Field(default=None, ge=0)
    unit: Optional[str] = Field(default=None, pattern=UNIT_PATTERN)
    low_stock_threshold: Optional[float] = Field(default=None, ge=0)
    unit_cost: Optional[float] = Field(default=None, ge=0)


class InventoryItemResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    category: str
    supplier: Optional[str] = None
    quantity: float
    unit: str
    low_stock_threshold: float
    unit_cost: float
    is_low_stock: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, item):
        quantity = float(item.quantity)
        threshold = float(item.low_stock_threshold)
        return cls(
            id=item.id,
            tenant_id=item.tenant_id,
            name=item.name,
            category=item.category or "General",
            supplier=item.supplier,
            quantity=quantity,
            unit=item.unit,
            low_stock_threshold=threshold,
            unit_cost=float(item.unit_cost or 0),
            is_low_stock=quantity <= threshold,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
