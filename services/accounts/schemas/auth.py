"""
Zahi Connect - Auth Schemas (Pydantic)
Mirrors MyCalo Backend/apps/accounts/serializers.py exactly.

MyCalo Serializer → Zahi Schema mapping:
  RegisterSerializer        → RegisterSchema
  VerifyOTPSerializer       → VerifyOTPSchema
  CustomTokenJwtSerializer  → LoginSchema (input)
  ForgotPasswordSerializer  → ForgotPasswordSchema
  ResetPasswordSerializer   → ResetPasswordSchema
  UserSerializer            → UserSchema
"""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


# ──────────────────────────────────────────────────────────────
#  RegisterSerializer → RegisterSchema
#  Same fields: username, email, mobile, password, confirm_password
#  Same validation: passwords must match
#  Same create logic: is_active=False until OTP
# ──────────────────────────────────────────────────────────────
class RegisterSchema(BaseModel):
    username: str = Field(..., min_length=3, max_length=150)
    email: EmailStr
    mobile: Optional[str] = Field(None, max_length=15)
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)
    tenant_id: Optional[uuid.UUID] = None
    role: str = Field(default="customer")

    @model_validator(mode="after")
    def passwords_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


# ──────────────────────────────────────────────────────────────
#  VerifyOTPSerializer → VerifyOTPSchema
#  Same fields: email, otp (max_length=6)
# ──────────────────────────────────────────────────────────────
class VerifyOTPSchema(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)


# ──────────────────────────────────────────────────────────────
#  CustomTokenJwtSerializer (input) → LoginSchema
#  MyCalo uses username field (which can be email via EmailUsernameBackend)
# ──────────────────────────────────────────────────────────────
class LoginSchema(BaseModel):
    username: str  # Can be username or email
    password: str


# ──────────────────────────────────────────────────────────────
#  Token Response (mirrors MyCalo's login response data)
# ──────────────────────────────────────────────────────────────
class TokenResponseSchema(BaseModel):
    access: str
    id: uuid.UUID
    username: str
    email: str
    role: str
    mobile: Optional[str] = None
    tenant_id: Optional[uuid.UUID] = None


# ──────────────────────────────────────────────────────────────
#  ForgotPasswordSerializer → ForgotPasswordSchema
#  Same field: email
# ──────────────────────────────────────────────────────────────
class ForgotPasswordSchema(BaseModel):
    email: EmailStr


# ──────────────────────────────────────────────────────────────
#  ResetPasswordSerializer → ResetPasswordSchema
#  Same fields: email, otp, new_password, confirm_password
#  Same validation: passwords must match
# ──────────────────────────────────────────────────────────────
class ResetPasswordSchema(BaseModel):
    email: EmailStr
    otp: str = Field(..., min_length=6, max_length=6)
    new_password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        return self


# ──────────────────────────────────────────────────────────────
#  ChangePasswordView input → ChangePasswordSchema
#  Same fields: old_password, new_password
# ──────────────────────────────────────────────────────────────
class ChangePasswordSchema(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)


# ──────────────────────────────────────────────────────────────
#  GoogleLoginView input → GoogleLoginSchema
#  Same field: token (Google Access Token)
# ──────────────────────────────────────────────────────────────
class GoogleLoginSchema(BaseModel):
    token: str


# ──────────────────────────────────────────────────────────────
#  UserSerializer → UserSchema
#  Same fields: id, username, email, mobile, status, role, is_active
# ──────────────────────────────────────────────────────────────
class UserSchema(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    mobile: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str
    status: str
    is_active: bool
    tenant_id: Optional[uuid.UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateSchema(BaseModel):
    username: Optional[str] = None
    mobile: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    status: Optional[str] = None
    role: Optional[str] = None


# ──────────────────────────────────────────────────────────────
#  Tenant Schemas (new for Zahi multi-tenant)
# ──────────────────────────────────────────────────────────────
class TenantCreateSchema(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    business_type: str = Field(default="hotel")
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    plan: str = Field(default="free")


class TenantResponseSchema(BaseModel):
    id: uuid.UUID
    name: str
    slug: str
    business_type: str
    email: str
    phone: Optional[str] = None
    plan: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
