"""
Zahi Connect - User & Tenant Models
Mirrors MyCalo Backend/apps/accounts/models.py (CustomUser)
Adapted for multi-tenant architecture with tenant_id.
"""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from database import Base


class Tenant(Base):
    """
    Represents a business (Hotel, Restaurant, Agency, Cab Fleet)
    that signs up on Zahi Connect.
    """

    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    business_type = Column(String(50), nullable=False, default="hotel")
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(20), nullable=True)
    address = Column(Text, nullable=True)
    plan = Column(String(50), default="free")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    memberships = relationship("WorkspaceMembership", back_populates="tenant", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Tenant {self.name}>"


class User(Base):
    """
    Mirrors MyCalo's CustomUser(AbstractUser) exactly:
    - email (unique), mobile, otp, totp_secret
    - role choices, status choices
    - is_active (False until OTP verification)

    Extended for Zahi:
    - tenant_id (multi-tenant)
    - hashed_password (replaces Django's set_password)
    - Extended roles for hotel/restaurant/cab/travel
    """

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=True
    )

    # --- Core fields (same as MyCalo CustomUser) ---
    username = Column(String(150), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=True)  # nullable for Google OAuth
    mobile = Column(String(15), nullable=True)  # max_length=15 same as MyCalo
    first_name = Column(String(150), nullable=True)
    last_name = Column(String(150), nullable=True)
    address = Column(Text, nullable=True)

    # --- OTP fields (same as MyCalo) ---
    otp = Column(String(6), nullable=True)
    totp_secret = Column(String(32), nullable=True)

    # --- Role (extended from MyCalo's admin/user/doctor/employee) ---
    role = Column(String(20), default="customer")
    # Roles: super_admin, business_admin, staff, driver, guide, customer

    # --- Status (same as MyCalo: active/inactive) ---
    status = Column(String(20), default="active")
    # Status: active, inactive, suspended

    is_active = Column(Boolean, default=False)  # False until OTP verify (same as MyCalo)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    tenant = relationship("Tenant", back_populates="users")
    memberships = relationship("WorkspaceMembership", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.username}>"


class WorkspaceMembership(Base):
    """Links one account to multiple paid business workspaces."""

    __tablename__ = "workspace_memberships"
    __table_args__ = (
        UniqueConstraint("user_id", "tenant_id", name="uq_workspace_membership_user_tenant"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), default="business_admin", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="memberships")
    tenant = relationship("Tenant", back_populates="memberships")

    def __repr__(self):
        return f"<WorkspaceMembership user={self.user_id} tenant={self.tenant_id}>"
