import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


class BookingRequestCreate(BaseModel):
    service_type: Literal["hotel", "restaurant", "cab", "flight"]
    title: str = Field(..., min_length=3, max_length=255)
    summary: str | None = Field(default=None, max_length=4000)
    tenant_id: uuid.UUID | None = None
    tenant_slug: str | None = Field(default=None, max_length=120)
    tenant_name: str | None = Field(default=None, max_length=255)
    total_amount: float | None = Field(default=None, ge=0)
    currency: str = Field(default="INR", min_length=3, max_length=10)
    metadata: dict[str, Any] = Field(default_factory=dict)


class BookingRequestResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_email: str
    user_name: str
    service_type: str
    status: str
    title: str
    summary: str | None = None
    tenant_id: uuid.UUID | None = None
    tenant_slug: str | None = None
    tenant_name: str | None = None
    total_amount: float | None = None
    currency: str
    metadata: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime


class BookingPaymentCheckoutCreate(BaseModel):
    service_type: Literal["hotel", "restaurant", "cab", "flight"]
    title: str = Field(..., min_length=3, max_length=255)
    summary: str | None = Field(default=None, max_length=4000)
    tenant_id: uuid.UUID | None = None
    tenant_slug: str | None = Field(default=None, max_length=120)
    tenant_name: str | None = Field(default=None, max_length=255)
    total_amount: float = Field(..., gt=0)
    currency: str = Field(default="INR", min_length=3, max_length=10)
    metadata: dict[str, Any] = Field(default_factory=dict)


class BookingPaymentVerify(BaseModel):
    payment_order_id: uuid.UUID
    razorpay_order_id: str = Field(..., min_length=5, max_length=100)
    razorpay_payment_id: str = Field(..., min_length=5, max_length=100)
    razorpay_signature: str = Field(..., min_length=5, max_length=255)


class BookingPaymentCheckoutResponse(BaseModel):
    payment_order_id: uuid.UUID
    checkout: dict[str, Any]
