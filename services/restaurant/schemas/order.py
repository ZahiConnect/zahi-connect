"""Order schemas — request/response models for orders and order items."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class OrderItemCreate(BaseModel):
    menu_item_id: uuid.UUID
    item_name: str
    quantity: int = Field(default=1, ge=1)
    unit_price: float = Field(..., gt=0)
    special_instructions: Optional[str] = None


class OrderItemResponse(BaseModel):
    id: uuid.UUID
    menu_item_id: uuid.UUID
    item_name: str
    quantity: int
    unit_price: float
    special_instructions: Optional[str] = None

    model_config = {"from_attributes": True}


class OrderCreate(BaseModel):
    table_id: Optional[uuid.UUID] = None
    order_type: str = Field(default="dine_in", pattern=r"^(dine_in|delivery|whatsapp|website)$")
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    special_instructions: Optional[str] = None
    items: list[OrderItemCreate] = Field(..., min_length=1)


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(new|preparing|ready|completed|cancelled)$")


class OrderResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    table_id: Optional[uuid.UUID] = None
    order_type: str
    status: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    total_amount: float
    special_instructions: Optional[str] = None
    items: list[OrderItemResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
