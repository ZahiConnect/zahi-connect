import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class SubscriptionOrder(Base):
    """Stores pending and paid onboarding purchases before the tenant is provisioned."""

    __tablename__ = "subscription_orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="SET NULL"),
        nullable=True,
    )

    business_name = Column(String(255), nullable=False)
    business_email = Column(String(255), nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    admin_username = Column(String(150), nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)

    business_type = Column(String(50), nullable=False)
    plan_code = Column(String(50), nullable=False)
    plan_name = Column(String(100), nullable=False)
    amount = Column(Integer, nullable=False)
    currency = Column(String(3), nullable=False, default="INR")
    receipt = Column(String(40), nullable=False, unique=True, index=True)

    razorpay_order_id = Column(String(100), nullable=False, unique=True, index=True)
    razorpay_payment_id = Column(String(100), nullable=True, unique=True)
    status = Column(String(20), nullable=False, default="created")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant")
