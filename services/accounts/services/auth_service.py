"""
Zahi Connect - Auth Service (Business Logic)
Contains all JWT creation, password hashing, token helpers.
Mirrors MyCalo's SimpleJWT token generation + set_password/check_password.
"""

import random
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt
import bcrypt

from config import settings

# Password hashing — equivalent to Django's make_password / check_password
# Using raw bcrypt to avoid passlib Python 3.12 ValueError limit bugs


class AuthService:

    # ─── Password Helpers (mirrors Django's set_password / check_password) ───

    @staticmethod
    def hash_password(password: str) -> str:
        """Equivalent to Django user.set_password(password)"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Equivalent to Django user.check_password(password)"""
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

    # ─── OTP Generation (same as MyCalo: random.randint(100000, 999999)) ───

    @staticmethod
    def generate_otp() -> str:
        return str(random.randint(100000, 999999))

    # ─── JWT Token Creation (mirrors MyCalo's SimpleJWT) ───

    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """
        Mirrors MyCalo's RefreshToken.for_user(user) → access_token generation.
        Claims: user_id, username, email, role, tenant_id
        """
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + (
            expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def create_refresh_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """
        Mirrors MyCalo's RefreshToken.for_user(user) → refresh token.
        Stored in HttpOnly cookie (same as MyCalo's AUTH_COOKIE).
        """
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + (
            expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
        to_encode.update({"exp": expire, "type": "refresh"})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    @staticmethod
    def decode_token(token: str) -> Optional[dict]:
        """Decode and validate a JWT token."""
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            return payload
        except JWTError:
            return None

    # ─── Token Data Builder ───

    @staticmethod
    def build_token_data(user) -> dict:
        """Build JWT payload claims from a User object."""
        return {
            "user_id": str(user.id),
            "username": user.username,
            "email": user.email,
            "role": user.role,
            "tenant_id": str(user.tenant_id) if user.tenant_id else None,
        }

    # ─── Cookie Helper (mirrors MyCalo's response.set_cookie) ───

    @staticmethod
    def set_refresh_cookie(response, refresh_token: str) -> None:
        """
        Mirrors MyCalo's:
        response.set_cookie(
            key=settings.SIMPLE_JWT["AUTH_COOKIE"],
            value=refresh_token,
            max_age=settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"],
            secure=settings.SIMPLE_JWT["AUTH_COOKIE_SECURE"],
            httponly=settings.SIMPLE_JWT["AUTH_COOKIE_HTTP_ONLY"],
            samesite=settings.SIMPLE_JWT["AUTH_COOKIE_SAMESITE"],
        )
        """
        response.set_cookie(
            key=settings.AUTH_COOKIE,
            value=refresh_token,
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            secure=settings.AUTH_COOKIE_SECURE,
            httponly=settings.AUTH_COOKIE_HTTP_ONLY,
            samesite=settings.AUTH_COOKIE_SAMESITE,
        )

    # ─── Google OAuth Username Generator ───

    @staticmethod
    def generate_google_username(email: str) -> str:
        """
        Mirrors MyCalo's GoogleLoginView:
        random_suffix = "".join(secrets.choice(...) for _ in range(4))
        username = f"{email.split('@')[0]}_{random_suffix}"
        """
        random_suffix = "".join(
            secrets.choice(string.ascii_lowercase + string.digits) for _ in range(4)
        )
        return f"{email.split('@')[0]}_{random_suffix}"
