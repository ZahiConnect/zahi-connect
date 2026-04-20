from typing import Any

from pydantic import BaseModel, Field


class FilterSchema(BaseModel):
    field: str
    operator: str = "="
    value: Any


class QueryRequest(BaseModel):
    filters: list[FilterSchema] = Field(default_factory=list)
    sort_field: str | None = None
    sort_direction: str = "ASC"
    limit: int = 100
    offset: int = 0
