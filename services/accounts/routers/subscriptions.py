import hashlib
import hmac
import re
import uuid

import httpx
from fastapi import APIRouter, Depends, Response, status
from fastapi.exceptions import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import get_db
from dependencies import get_current_user
from models.subscription import SubscriptionOrder
from models.user import Tenant, User, WorkspaceMembership
from schemas.subscription import (
    SubscriptionCheckoutResponseSchema,
    SubscriptionCheckoutSchema,
    SubscriptionPlanSchema,
    SubscriptionVerifySchema,
)
from services.auth_service import AuthService
from services.subscription_catalog import get_plan_by_code, list_subscription_plans
from services.user_payload import build_authenticated_user_payload

router = APIRouter(tags=["Subscriptions"])

auth = AuthService()


def ensure_razorpay_is_configured():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Razorpay is not configured on the server.",
        )


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug[:90] or f"workspace-{uuid.uuid4().hex[:6]}"


async def build_unique_slug(db: AsyncSession, business_name: str) -> str:
    base_slug = slugify(business_name)
    slug = base_slug
    suffix = 1

    while True:
        result = await db.execute(select(Tenant).where(Tenant.slug == slug))
        if not result.scalar_one_or_none():
            return slug
        suffix += 1
        slug = f"{base_slug[:80]}-{suffix}"


async def create_razorpay_order(plan: dict, receipt: str):
    ensure_razorpay_is_configured()

    payload = {
        "amount": plan["amount"],
        "currency": "INR",
        "receipt": receipt,
        "notes": {
            "plan_code": plan["code"],
            "business_type": plan["business_type"],
        },
    }

    try:
        async with httpx.AsyncClient(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            timeout=20,
        ) as client:
            response = await client.post("https://api.razorpay.com/v1/orders", json=payload)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to create Razorpay order: {exc}",
        )


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    generated_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        f"{order_id}|{payment_id}".encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(generated_signature, signature)


async def fetch_razorpay_payment(payment_id: str):
    try:
        async with httpx.AsyncClient(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            timeout=20,
        ) as client:
            response = await client.get(f"https://api.razorpay.com/v1/payments/{payment_id}")
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to fetch Razorpay payment: {exc}",
        )


async def capture_razorpay_payment(payment_id: str, amount: int, currency: str):
    try:
        async with httpx.AsyncClient(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            timeout=20,
        ) as client:
            response = await client.post(
                f"https://api.razorpay.com/v1/payments/{payment_id}/capture",
                json={"amount": amount, "currency": currency},
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to capture Razorpay payment: {exc}",
        )


@router.get("/plans", response_model=list[SubscriptionPlanSchema])
async def get_subscription_plans():
    """Public plan catalog used by the landing page."""
    return list_subscription_plans()


@router.post("/checkout", response_model=SubscriptionCheckoutResponseSchema)
async def create_subscription_checkout(
    data: SubscriptionCheckoutSchema,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a Razorpay order for a selected Zahi workspace plan."""
    plan = get_plan_by_code(data.plan_code)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Selected subscription plan does not exist.",
        )

    receipt = f"zahi_{uuid.uuid4().hex[:12]}"
    razorpay_order = await create_razorpay_order(plan, receipt)

    subscription_order = SubscriptionOrder(
        tenant_id=None,
        business_name=data.business_name,
        business_email=current_user.email,
        phone=data.phone,
        address=data.address,
        admin_username=current_user.username,
        hashed_password=current_user.hashed_password or auth.hash_password(uuid.uuid4().hex),
        business_type=plan["business_type"],
        plan_code=plan["code"],
        plan_name=plan["name"],
        amount=plan["amount"],
        currency="INR",
        receipt=receipt,
        razorpay_order_id=razorpay_order["id"],
        status="created",
    )

    db.add(subscription_order)
    await db.commit()
    await db.refresh(subscription_order)

    return {
        "subscription_order_id": subscription_order.id,
        "plan": plan,
        "checkout": {
            "key": settings.RAZORPAY_KEY_ID,
            "order_id": razorpay_order["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "name": "Zahi Connect",
            "description": f"{plan['name']} onboarding payment",
            "prefill": {
                "name": data.business_name,
                "email": current_user.email,
                "contact": data.phone or "",
            },
            "notes": {
                "plan_code": plan["code"],
                "business_type": plan["business_type"],
                "owner_username": current_user.username,
            },
        },
    }


@router.post("/verify")
async def verify_subscription_payment(
    data: SubscriptionVerifySchema,
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verify payment, provision the tenant, and sign in the business owner."""
    ensure_razorpay_is_configured()

    result = await db.execute(
        select(SubscriptionOrder).where(SubscriptionOrder.id == data.subscription_order_id)
    )
    subscription_order = result.scalar_one_or_none()

    if not subscription_order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    if (
        subscription_order.business_email != current_user.email
        or subscription_order.admin_username != current_user.username
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This payment order belongs to a different account.",
        )

    if subscription_order.status == "paid":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This subscription order has already been activated.",
        )

    if subscription_order.razorpay_order_id != data.razorpay_order_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order mismatch while verifying payment.",
        )

    if not verify_payment_signature(
        data.razorpay_order_id,
        data.razorpay_payment_id,
        data.razorpay_signature,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Razorpay signature.",
        )

    payment = await fetch_razorpay_payment(data.razorpay_payment_id)
    if payment.get("order_id") != subscription_order.razorpay_order_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment does not belong to the selected order.",
        )

    if payment.get("amount") != subscription_order.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment amount does not match the selected plan.",
        )

    payment_status = payment.get("status")
    if payment_status == "authorized":
        payment = await capture_razorpay_payment(
            data.razorpay_payment_id,
            subscription_order.amount,
            subscription_order.currency,
        )
        payment_status = payment.get("status")

    if payment_status != "captured":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Payment is not captured yet. Please try again in a moment.",
        )

    slug = await build_unique_slug(db, subscription_order.business_name)
    tenant = Tenant(
        name=subscription_order.business_name,
        slug=slug,
        business_type=subscription_order.business_type,
        email=subscription_order.business_email,
        phone=subscription_order.phone,
        address=subscription_order.address,
        plan=subscription_order.plan_code,
        is_active=True,
    )
    db.add(tenant)

    current_user.tenant = tenant
    current_user.mobile = subscription_order.phone or current_user.mobile
    current_user.role = "business_admin"
    current_user.status = "active"
    current_user.is_active = True

    subscription_order.tenant = tenant
    subscription_order.razorpay_payment_id = data.razorpay_payment_id
    subscription_order.status = "paid"
    db.add(
        WorkspaceMembership(
            user=current_user,
            tenant=tenant,
            role="business_admin",
        )
    )

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This workspace was already created for the selected account.",
        )

    await db.refresh(tenant)
    await db.refresh(current_user)

    token_data = auth.build_token_data(current_user)
    access_token = auth.create_access_token(token_data)
    refresh_token = auth.create_refresh_token(token_data)
    auth.set_refresh_cookie(response, refresh_token)
    user_payload = await build_authenticated_user_payload(db, current_user)

    return {
        "access": access_token,
        **user_payload,
    }
