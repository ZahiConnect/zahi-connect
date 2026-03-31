"""Order schemas for order intake and kitchen workflows."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, model_validator


class OrderItemCreate(BaseModel):
    menu_item_id: uuid.UUID
    quantity: int = Field(default=1, ge=1)
    special_instructions: Optional[str] = None

    model_config = {"extra": "ignore"}


class OrderItemResponse(BaseModel):
    id: uuid.UUID
    menu_item_id: uuid.UUID
    item_name: str
    quantity: int
    unit_price: float
    special_instructions: Optional[str] = None
    line_total: float

    model_config = {"from_attributes": True}


class OrderCreate(BaseModel):
    table_id: Optional[uuid.UUID] = None
    order_type: str = Field(default="dine_in", pattern=r"^(dine_in|delivery|whatsapp|website)$")
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    special_instructions: Optional[str] = None
    items: list[OrderItemCreate] = Field(..., min_length=1)

    @model_validator(mode="after")
    def validate_order_requirements(self):
        if self.order_type == "dine_in" and not self.table_id:
            raise ValueError("Dine-in orders require a table")
        if self.order_type == "delivery" and not self.delivery_address:
            raise ValueError("Delivery orders require a delivery address")
        return self


class OrderStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(new|preparing|ready|completed|cancelled)$")


class OrderResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    table_id: Optional[uuid.UUID] = None
    table_number: Optional[int] = None
    order_type: str
    status: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    delivery_address: Optional[str] = None
    total_amount: float
    special_instructions: Optional[str] = None
    item_count: int = 0
    items: list[OrderItemResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
