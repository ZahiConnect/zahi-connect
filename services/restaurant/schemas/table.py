"""Table schemas."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


TABLE_STATUS_PATTERN = r"^(available|occupied|reserved)$"


class TableCreate(BaseModel):
    table_number: int = Field(..., ge=1)
    capacity: int = Field(default=4, ge=1)
    status: str = Field(default="available", pattern=TABLE_STATUS_PATTERN)
    assigned_staff: Optional[str] = None


class TableUpdate(BaseModel):
    table_number: Optional[int] = Field(default=None, ge=1)
    capacity: Optional[int] = Field(default=None, ge=1)
    status: Optional[str] = Field(default=None, pattern=TABLE_STATUS_PATTERN)
    assigned_staff: Optional[str] = None


class TableStatusUpdate(BaseModel):
    status: str = Field(..., pattern=TABLE_STATUS_PATTERN)
    assigned_staff: Optional[str] = None


class TableResponse(BaseModel):
    id: uuid.UUID
    tenant_id: uuid.UUID
    table_number: int
    capacity: int
    status: str
    assigned_staff: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
