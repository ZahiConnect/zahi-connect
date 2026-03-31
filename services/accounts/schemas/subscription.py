import uuid
from typing import Optional

from pydantic import BaseModel, Field


class SubscriptionPlanSchema(BaseModel):
    code: str
    name: str
    business_type: str
    amount: int
    display_price: str
    badge: str
    headline: str
    description: str
    featured: bool = False
    features: list[str]
    dashboard_modules: list[str]


class SubscriptionCheckoutSchema(BaseModel):
    plan_code: str
    business_name: str = Field(..., min_length=2, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = Field(None, max_length=500)


class SubscriptionCheckoutResponseSchema(BaseModel):
    subscription_order_id: uuid.UUID
    checkout: dict
    plan: SubscriptionPlanSchema


class SubscriptionVerifySchema(BaseModel):
    subscription_order_id: uuid.UUID
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
