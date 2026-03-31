"""Table schemas."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TableCreate(BaseModel):
    table_number: int = Field(..., ge=1)
    capacity: int = Field(default=4, ge=1)
    status: str = Field(default="available", pattern=r"^(available|occupied|reserved)$")
    assigned_staff: Optional[str] = None


class TableStatusUpdate(BaseModel):
    status: str = Field(..., pattern=r"^(available|occupied|reserved)$")
    assigned_staff: Optional[str] = None


class TableResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    table_number: int
    capacity: int
    status: str
    assigned_staff: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
