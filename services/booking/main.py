import asyncio
import hashlib
import hmac
import uuid
from contextlib import asynccontextmanager
from decimal import Decimal

import httpx
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import Base, get_db, engine
from dependencies import CustomerContext, get_customer_context
from models import BookingPaymentOrder, BookingRequest
from schemas import (
    BookingPaymentCheckoutCreate,
    BookingPaymentCheckoutResponse,
    BookingPaymentVerify,
    BookingRequestCreate,
    BookingRequestResponse,
)

STARTUP_DB_RETRIES = 15
STARTUP_DB_RETRY_DELAY_SECONDS = 2


def serialize_booking(record: BookingRequest) -> dict:
    return {
        "id": record.id,
        "user_id": record.user_id,
        "user_email": record.user_email,
        "user_name": record.user_name,
        "service_type": record.service_type,
        "status": record.status,
        "title": record.title,
        "summary": record.summary,
        "tenant_id": record.tenant_id,
        "tenant_slug": record.tenant_slug,
        "tenant_name": record.tenant_name,
        "total_amount": float(record.total_amount) if isinstance(record.total_amount, Decimal) else record.total_amount,
        "currency": record.currency,
        "metadata": dict(record.details or {}),
        "created_at": record.created_at,
        "updated_at": record.updated_at,
    }


def ensure_razorpay_is_configured():
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Razorpay is not configured on the server.",
        )


def amount_to_paise(amount: float) -> int:
    return int(round(amount * 100))


def amount_from_paise(amount_paise: int) -> float:
    return round(amount_paise / 100, 2)


def build_booking_details(
    metadata: dict,
    *,
    payment_details: dict | None = None,
) -> dict:
    details = dict(metadata or {})
    if payment_details:
        details["payment"] = payment_details
    return details


def build_booking_record(
    *,
    customer: CustomerContext,
    payload: BookingRequestCreate | BookingPaymentCheckoutCreate,
    tenant_slug: str | None,
    tenant_name: str | None,
    status_value: str = "submitted",
    metadata: dict | None = None,
) -> BookingRequest:
    return BookingRequest(
        user_id=customer.user_id,
        user_email=customer.email,
        user_name=customer.username or customer.email,
        service_type=payload.service_type,
        status=status_value,
        title=payload.title,
        summary=payload.summary,
        tenant_id=payload.tenant_id,
        tenant_slug=tenant_slug,
        tenant_name=tenant_name,
        total_amount=payload.total_amount,
        currency=payload.currency.upper(),
        details=metadata if metadata is not None else payload.metadata,
    )


async def create_razorpay_order(*, amount_paise: int, currency: str, receipt: str, notes: dict):
    ensure_razorpay_is_configured()
    payload = {
        "amount": amount_paise,
        "currency": currency.upper(),
        "receipt": receipt,
        "notes": notes,
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


async def capture_razorpay_payment(payment_id: str, amount_paise: int, currency: str):
    try:
        async with httpx.AsyncClient(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET),
            timeout=20,
        ) as client:
            response = await client.post(
                f"https://api.razorpay.com/v1/payments/{payment_id}/capture",
                json={"amount": amount_paise, "currency": currency.upper()},
            )
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to capture Razorpay payment: {exc}",
        )


async def initialize_database():
    last_error = None

    for attempt in range(1, STARTUP_DB_RETRIES + 1):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            return
        except Exception as exc:
            last_error = exc
            print(
                "[startup] booking database not ready "
                f"(attempt {attempt}/{STARTUP_DB_RETRIES}): {exc}"
            )
            if attempt == STARTUP_DB_RETRIES:
                raise
            await asyncio.sleep(STARTUP_DB_RETRY_DELAY_SECONDS)

    raise last_error


async def hydrate_tenant_payload(
    db: AsyncSession,
    tenant_id,
    tenant_slug: str | None,
    tenant_name: str | None,
) -> tuple[str | None, str | None]:
    if not tenant_id:
        return tenant_slug, tenant_name

    tenant_row = await db.execute(
        text("SELECT slug, name FROM tenants WHERE id = :tenant_id"),
        {"tenant_id": tenant_id},
    )
    tenant = tenant_row.mappings().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Referenced tenant was not found.")

    return tenant_slug or tenant["slug"], tenant_name or tenant["name"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    await initialize_database()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/booking/docs",
    openapi_url="/booking/openapi.json",
    redoc_url="/booking/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:3000",
        "http://localhost:8080",
    ],
    allow_origin_regex=(
        r"^https?://"
        r"(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|"
        r"172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})"
        r"(?::(?:3000|5173|5174|8080))?$"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/booking")
async def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}


@app.get("/booking/requests", response_model=list[BookingRequestResponse])
async def list_booking_requests(
    service_type: str | None = None,
    db: AsyncSession = Depends(get_db),
    customer: CustomerContext = Depends(get_customer_context),
):
    stmt = (
        select(BookingRequest)
        .where(BookingRequest.user_id == customer.user_id)
        .order_by(BookingRequest.created_at.desc())
    )

    if service_type:
        stmt = stmt.where(BookingRequest.service_type == service_type)

    records = (await db.execute(stmt)).scalars().all()
    return [serialize_booking(record) for record in records]


@app.post("/booking/requests", response_model=BookingRequestResponse, status_code=201)
async def create_booking_request(
    payload: BookingRequestCreate,
    db: AsyncSession = Depends(get_db),
    customer: CustomerContext = Depends(get_customer_context),
):
    tenant_slug, tenant_name = await hydrate_tenant_payload(
        db,
        payload.tenant_id,
        payload.tenant_slug,
        payload.tenant_name,
    )

    booking_request = build_booking_record(
        customer=customer,
        payload=payload,
        tenant_slug=tenant_slug,
        tenant_name=tenant_name,
    )
    db.add(booking_request)
    await db.commit()
    await db.refresh(booking_request)
    return serialize_booking(booking_request)


@app.post("/booking/payments/checkout", response_model=BookingPaymentCheckoutResponse)
async def create_booking_payment_checkout(
    payload: BookingPaymentCheckoutCreate,
    db: AsyncSession = Depends(get_db),
    customer: CustomerContext = Depends(get_customer_context),
):
    tenant_slug, tenant_name = await hydrate_tenant_payload(
        db,
        payload.tenant_id,
        payload.tenant_slug,
        payload.tenant_name,
    )

    amount_paise = amount_to_paise(payload.total_amount)
    receipt = f"booking_{uuid.uuid4().hex[:12]}"
    razorpay_order = await create_razorpay_order(
        amount_paise=amount_paise,
        currency=payload.currency,
        receipt=receipt,
        notes={
            "service_type": payload.service_type,
            "tenant_slug": tenant_slug or "",
            "customer_email": customer.email,
        },
    )

    payment_order = BookingPaymentOrder(
        user_id=customer.user_id,
        user_email=customer.email,
        user_name=customer.username or customer.email,
        service_type=payload.service_type,
        title=payload.title,
        summary=payload.summary,
        tenant_id=payload.tenant_id,
        tenant_slug=tenant_slug,
        tenant_name=tenant_name,
        amount_paise=amount_paise,
        currency=payload.currency.upper(),
        receipt=receipt,
        razorpay_order_id=razorpay_order["id"],
        details=payload.metadata,
    )
    db.add(payment_order)
    await db.commit()
    await db.refresh(payment_order)

    return {
        "payment_order_id": payment_order.id,
        "checkout": {
            "key": settings.RAZORPAY_KEY_ID,
            "order_id": razorpay_order["id"],
            "amount": razorpay_order["amount"],
            "currency": razorpay_order["currency"],
            "name": "Zahi Trips",
            "description": payload.title,
            "prefill": {
                "name": customer.username or customer.email,
                "email": customer.email,
            },
            "notes": {
                "service_type": payload.service_type,
                "tenant_slug": tenant_slug or "",
                "tenant_name": tenant_name or "",
            },
        },
    }


@app.post("/booking/payments/verify", response_model=BookingRequestResponse)
async def verify_booking_payment(
    payload: BookingPaymentVerify,
    db: AsyncSession = Depends(get_db),
    customer: CustomerContext = Depends(get_customer_context),
):
    ensure_razorpay_is_configured()

    payment_order = (
        await db.execute(
            select(BookingPaymentOrder).where(BookingPaymentOrder.id == payload.payment_order_id)
        )
    ).scalar_one_or_none()

    if not payment_order:
        raise HTTPException(status_code=404, detail="Payment order not found.")

    if payment_order.user_id != customer.user_id:
        raise HTTPException(status_code=403, detail="This payment belongs to another customer.")

    if payment_order.status == "paid" and payment_order.booking_request_id:
        existing_booking = (
            await db.execute(
                select(BookingRequest).where(BookingRequest.id == payment_order.booking_request_id)
            )
        ).scalar_one_or_none()
        if existing_booking:
            return serialize_booking(existing_booking)

    if payment_order.razorpay_order_id != payload.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Order mismatch while verifying payment.")

    if not verify_payment_signature(
        payload.razorpay_order_id,
        payload.razorpay_payment_id,
        payload.razorpay_signature,
    ):
        raise HTTPException(status_code=400, detail="Invalid Razorpay signature.")

    payment = await fetch_razorpay_payment(payload.razorpay_payment_id)
    if payment.get("order_id") != payment_order.razorpay_order_id:
        raise HTTPException(status_code=400, detail="Payment does not belong to the selected order.")

    if payment.get("amount") != payment_order.amount_paise:
        raise HTTPException(status_code=400, detail="Payment amount does not match the checkout order.")

    payment_status = payment.get("status")
    if payment_status == "authorized":
        payment = await capture_razorpay_payment(
            payload.razorpay_payment_id,
            payment_order.amount_paise,
            payment_order.currency,
        )
        payment_status = payment.get("status")

    if payment_status != "captured":
        raise HTTPException(
            status_code=400,
            detail="Payment is not captured yet. Please try again in a moment.",
        )

    paid_payload = BookingRequestCreate(
        service_type=payment_order.service_type,
        title=payment_order.title,
        summary=payment_order.summary,
        tenant_id=payment_order.tenant_id,
        tenant_slug=payment_order.tenant_slug,
        tenant_name=payment_order.tenant_name,
        total_amount=amount_from_paise(payment_order.amount_paise),
        currency=payment_order.currency,
        metadata=build_booking_details(
            payment_order.details or {},
            payment_details={
                "provider": "razorpay",
                "status": "captured",
                "razorpay_order_id": payload.razorpay_order_id,
                "razorpay_payment_id": payload.razorpay_payment_id,
            },
        ),
    )

    tenant_slug, tenant_name = await hydrate_tenant_payload(
        db,
        paid_payload.tenant_id,
        paid_payload.tenant_slug,
        paid_payload.tenant_name,
    )
    booking_request = build_booking_record(
        customer=customer,
        payload=paid_payload,
        tenant_slug=tenant_slug,
        tenant_name=tenant_name,
        status_value="paid",
        metadata=paid_payload.metadata,
    )
    db.add(booking_request)
    await db.flush()

    payment_order.booking_request_id = booking_request.id
    payment_order.razorpay_payment_id = payload.razorpay_payment_id
    payment_order.status = "paid"

    await db.commit()
    await db.refresh(booking_request)
    return serialize_booking(booking_request)
