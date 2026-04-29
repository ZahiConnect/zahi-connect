"""
Zahi Connect - Auth Router
Mirrors MyCalo Backend/apps/accounts/views.py EXACTLY.

MyCalo View                → Zahi Endpoint
─────────────────────────────────────────────────────
CustomTokenjwtView         → POST /login
CustomTokenRefreshView     → POST /token/refresh
RegisterView               → POST /register
VerifyOTPView              → POST /verify-otp
GoogleLoginView            → POST /google-login
ForgotPasswordView         → POST /forgot-password
ResetPasswordView          → POST /reset-password
ChangePasswordView         → POST /change-password
LogoutView                 → POST /logout
"""

import httpx
from fastapi import APIRouter, Cookie, Depends, Request, Response, status
from fastapi.exceptions import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from dependencies import get_current_user
from models.user import User
from schemas.auth import (
    ChangePasswordSchema,
    ForgotPasswordSchema,
    GoogleLoginSchema,
    LoginSchema,
    RegisterSchema,
    ResendOTPSchema,
    ResetPasswordSchema,
    VerifyOTPSchema,
)
from services.auth_service import AuthService
from services.email_service import send_otp_email, send_password_reset_email
from services.client_portal import (
    CUSTOMER_PORTAL,
    WORKSPACE_PORTAL,
    assert_user_matches_portal,
    get_client_portal,
    get_registration_role,
)
from services.user_payload import build_authenticated_user_payload

router = APIRouter(tags=["Authentication"])

auth = AuthService()


def send_otp_email_or_raise(email: str, otp_code: str) -> None:
    if not send_otp_email(email, otp_code):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Could not send OTP email. Please check email settings and try again.",
        )


# ═══════════════════════════════════════════════════════════════
#  POST /register — Mirrors MyCalo's RegisterView
# ═══════════════════════════════════════════════════════════════
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    data: RegisterSchema,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user. Sends an OTP to the email."""
    portal = get_client_portal(request)

    # Check if user exists (same as MyCalo)
    result = await db.execute(select(User).where(User.email == data.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        if not existing_user.is_active:
            # User exists but unverified — resend OTP (same as MyCalo)
            otp_code = auth.generate_otp()
            existing_user.otp = otp_code
            await db.commit()
            send_otp_email_or_raise(existing_user.email, otp_code)
            return {"message": "User exists but unverified. New OTP sent."}
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists.",
            )

    # Check username uniqueness
    result = await db.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken.",
        )

    # Create user with is_active=False (same as MyCalo's serializer.create)
    otp_code = auth.generate_otp()
    new_user = User(
        username=data.username,
        email=data.email,
        hashed_password=auth.hash_password(data.password),
        mobile=data.mobile,
        role=get_registration_role(data.role, portal),
        tenant_id=data.tenant_id,
        otp=otp_code,
        is_active=False,  # Same as MyCalo
    )
    db.add(new_user)

    from sqlalchemy.exc import IntegrityError
    try:
        await db.commit()
        await db.refresh(new_user)
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tenant_id. The specified tenant does not exist.",
        )

    send_otp_email_or_raise(new_user.email, otp_code)

    return {
        "message": "Registration successful. OTP sent to your email.",
        "id": str(new_user.id),
        "username": new_user.username,
        "email": new_user.email,
    }


# ═══════════════════════════════════════════════════════════════
#  POST /verify-otp — Mirrors MyCalo's VerifyOTPView
# ═══════════════════════════════════════════════════════════════
@router.post("/verify-otp")
async def verify_otp(
    request: Request,
    data: VerifyOTPSchema,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Verify User OTP and log them in."""
    portal = get_client_portal(request)

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.otp != data.otp:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP")

    # Activate user and clear OTP (same as MyCalo)
    user.is_active = True
    user.otp = None
    await db.commit()

    # Generate tokens (mirrors MyCalo's RefreshToken.for_user(user))
    assert_user_matches_portal(user, portal)
    token_data = auth.build_token_data(user)
    access_token = auth.create_access_token(token_data)
    refresh_token = auth.create_refresh_token(token_data)

    # Set refresh cookie (same as MyCalo)
    auth.set_refresh_cookie(response, refresh_token, portal)
    user_payload = await build_authenticated_user_payload(db, user)

    return {
        "message": "Account verified successfully!",
        "access": access_token,
        **user_payload,
    }


# ═══════════════════════════════════════════════════════════════
#  POST /login — Mirrors MyCalo's CustomTokenjwtView
# ═══════════════════════════════════════════════════════════════
# POST /resend-otp
@router.post("/resend-otp")
async def resend_otp(
    request: Request,
    data: ResendOTPSchema,
    db: AsyncSession = Depends(get_db),
):
    """Generate and send a fresh OTP for pending verification flows."""
    portal = get_client_portal(request)

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    assert_user_matches_portal(user, portal)

    if user.is_active and user.role not in ("super_admin", "business_admin"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account is already verified.",
        )

    otp_code = auth.generate_otp()
    user.otp = otp_code
    await db.commit()
    send_otp_email_or_raise(user.email, otp_code)

    return {"message": "OTP sent to your email."}


# POST /login - Mirrors MyCalo's CustomTokenjwtView
@router.post("/login")
async def login(
    request: Request,
    data: LoginSchema,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Obtain Access and Refresh tokens. Refresh token stored in HttpOnly cookie."""
    portal = get_client_portal(request)

    # Find user by email OR username (mirrors MyCalo's EmailUsernameBackend)
    result = await db.execute(
        select(User).where(
            or_(User.username == data.username, User.email == data.username)
        )
    )
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not auth.verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account not verified. Please verify your email OTP.",
        )

    # Check status (mirrors MyCalo's AccountStatusMiddleware)
    if user.status in ("inactive", "suspended"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been suspended by an administrator.",
        )

    # Generate tokens
    assert_user_matches_portal(user, portal)
    token_data = auth.build_token_data(user)
    access_token = auth.create_access_token(token_data)
    refresh_token = auth.create_refresh_token(token_data)

    # Set refresh in HttpOnly cookie, remove from response body (same as MyCalo)
    auth.set_refresh_cookie(response, refresh_token, portal)
    user_payload = await build_authenticated_user_payload(db, user)

    return {
        "access": access_token,
        **user_payload,
    }


# ═══════════════════════════════════════════════════════════════
#  POST /token/refresh — Mirrors MyCalo's CustomTokenRefreshView
# ═══════════════════════════════════════════════════════════════
@router.post("/token/refresh")
async def token_refresh(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Refresh Access Token using HttpOnly cookie."""
    portal = get_client_portal(request)
    cookie_name = auth.get_refresh_cookie_name(portal)

    # Read refresh token from cookie (same as MyCalo)
    refresh_token = request.cookies.get(cookie_name) or request.cookies.get(settings.AUTH_COOKIE)

    if not refresh_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token missing")

    payload = auth.decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        auth.clear_refresh_cookie(response, portal)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = payload.get("user_id")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        auth.clear_refresh_cookie(response, portal)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    # Rotate tokens (mirrors MyCalo's ROTATE_REFRESH_TOKENS=True)
    assert_user_matches_portal(user, portal)
    new_token_data = auth.build_token_data(user)
    new_access = auth.create_access_token(new_token_data)
    new_refresh = auth.create_refresh_token(new_token_data)

    auth.set_refresh_cookie(response, new_refresh, portal)
    user_payload = await build_authenticated_user_payload(db, user)
    user_payload.update({
        "status": user.status,
        "is_active": user.is_active,
    })

    # Return access + user data (same as MyCalo's CustomTokenRefreshView)
    return {
        "access": new_access,
        "user": user_payload,
    }


# ═══════════════════════════════════════════════════════════════
#  POST /google-login — Mirrors MyCalo's GoogleLoginView
# ═══════════════════════════════════════════════════════════════
@router.post("/google-login")
async def google_login(
    request: Request,
    data: GoogleLoginSchema,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    """Login or Register with Google Access Token."""
    portal = get_client_portal(request)

    if not data.token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No token provided")

    # Verify Google token (same as MyCalo's requests.get)
    async with httpx.AsyncClient() as client:
        google_resp = await client.get(
            f"https://www.googleapis.com/oauth2/v3/userinfo?access_token={data.token}"
        )

    if google_resp.status_code != 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Google Token")

    idinfo = google_resp.json()
    email = idinfo.get("email")
    first_name = idinfo.get("given_name", "")
    last_name = idinfo.get("family_name", "")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Could not retrieve email from Google"
        )

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user:
        assert_user_matches_portal(user, portal)
        # Check if admin role needs OTP (same as MyCalo)
        if user.role in ("super_admin", "business_admin"):
            otp_code = auth.generate_otp()
            user.otp = otp_code
            await db.commit()
            send_otp_email_or_raise(user.email, otp_code)
            return {"requires_otp": True, "email": user.email, "role": user.role}

        if user.status != "active":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account is blocked or inactive.",
            )
    else:
        # Create new user (same as MyCalo's GoogleLoginView)
        username = auth.generate_google_username(email)
        user = User(
            email=email,
            username=username,
            first_name=first_name,
            last_name=last_name,
            role="business_admin" if portal == WORKSPACE_PORTAL else "customer",
            is_active=True,
            status="active",
            hashed_password=None,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    # Generate tokens
    token_data = auth.build_token_data(user)
    access_token = auth.create_access_token(token_data)
    refresh_tok = auth.create_refresh_token(token_data)

    auth.set_refresh_cookie(response, refresh_tok, portal)
    user_payload = await build_authenticated_user_payload(db, user)

    return {
        "access": access_token,
        **user_payload,
    }


# ═══════════════════════════════════════════════════════════════
#  POST /forgot-password — Mirrors MyCalo's ForgotPasswordView
# ═══════════════════════════════════════════════════════════════
@router.post("/forgot-password")
async def forgot_password(
    data: ForgotPasswordSchema,
    db: AsyncSession = Depends(get_db),
):
    """Request password reset OTP via email."""

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User with this email does not exist.",
        )

    otp_code = auth.generate_otp()
    user.otp = otp_code
    await db.commit()

    send_password_reset_email(user.email, otp_code)
    return {"message": "OTP sent to your email."}


# ═══════════════════════════════════════════════════════════════
#  POST /reset-password — Mirrors MyCalo's ResetPasswordView
# ═══════════════════════════════════════════════════════════════
@router.post("/reset-password")
async def reset_password(
    data: ResetPasswordSchema,
    db: AsyncSession = Depends(get_db),
):
    """Reset password using OTP."""

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    # Same check as MyCalo: if user.otp == otp and user.otp is not None
    if user.otp != data.otp or user.otp is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OTP."
        )

    user.hashed_password = auth.hash_password(data.new_password)
    user.otp = None
    await db.commit()

    return {"message": "Password reset successfully."}


# ═══════════════════════════════════════════════════════════════
#  POST /change-password — Mirrors MyCalo's ChangePasswordView
# ═══════════════════════════════════════════════════════════════
@router.post("/change-password")
async def change_password(
    data: ChangePasswordSchema,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Change authenticated user's password."""

    # Same validation as MyCalo: min 6 chars
    if not data.new_password or len(data.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long.",
        )

    if not current_user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change password for Google-authenticated accounts.",
        )

    # Same check as MyCalo: if not user.check_password(old_password)
    if not auth.verify_password(data.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect old password."
        )

    current_user.hashed_password = auth.hash_password(data.new_password)
    await db.commit()

    return {"message": "Password updated successfully."}


# ═══════════════════════════════════════════════════════════════
#  POST /logout — Mirrors MyCalo's LogoutView
# ═══════════════════════════════════════════════════════════════
@router.post("/logout")
async def logout(request: Request, response: Response):
    """Logout user and clear auth cookie."""
    try:
        auth.clear_refresh_cookie(response, get_client_portal(request))
        return {"message": "Logout successful"}
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Logout failed")
