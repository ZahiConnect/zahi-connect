import asyncio
import hashlib
import hmac
import json
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from decimal import Decimal

import httpx
from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import Base, get_db, engine
from dependencies import CustomerContext, get_customer_context
from models import BookingPaymentOrder, BookingRequest, HotelDocument, FlightDocument
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


def clean_text(value) -> str | None:
    if value is None:
        return None
    text_value = str(value).strip()
    return text_value or None


def to_float(value) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (float, int, Decimal)):
        return float(value)
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


async def upsert_hotel_document(
    db: AsyncSession,
    *,
    tenant_id,
    collection: str,
    doc_id: str,
    payload: dict,
) -> HotelDocument:
    record = (
        await db.execute(
            select(HotelDocument).where(
                HotelDocument.tenant_id == tenant_id,
                HotelDocument.collection == collection,
                HotelDocument.doc_id == doc_id,
            )
        )
    ).scalar_one_or_none()

    normalized_payload = dict(payload or {})
    normalized_payload["id"] = doc_id

    if record:
        merged_payload = dict(record.payload or {})
        merged_payload.update(normalized_payload)
        record.payload = merged_payload
        return record

    record = HotelDocument(
        tenant_id=tenant_id,
        collection=collection,
        doc_id=doc_id,
        payload=normalized_payload,
    )
    db.add(record)
    return record


async def get_hotel_room_payload(
    db: AsyncSession,
    *,
    tenant_id,
    room_number: str,
) -> dict:
    record = (
        await db.execute(
            select(HotelDocument).where(
                HotelDocument.tenant_id == tenant_id,
                HotelDocument.collection == "rooms",
                HotelDocument.doc_id == room_number,
            )
        )
    ).scalar_one_or_none()

    if not record:
        raise HTTPException(status_code=404, detail="Selected room was not found.")

    payload = dict(record.payload or {})
    payload["id"] = record.doc_id
    return payload


async def validate_hotel_checkout_room(
    db: AsyncSession,
    *,
    tenant_id,
    metadata: dict,
) -> dict | None:
    selected_room_number = clean_text(metadata.get("selected_room_number"))
    if not selected_room_number:
        return None

    room_payload = await get_hotel_room_payload(
        db,
        tenant_id=tenant_id,
        room_number=selected_room_number,
    )
    room_status = clean_text(room_payload.get("status")) or "Available"
    if room_status.lower() != "available":
        raise HTTPException(
            status_code=409,
            detail="Selected room is not available anymore.",
        )

    return room_payload


def build_hotel_customer_payload(customer: CustomerContext, metadata: dict) -> dict:
    now_iso = datetime.utcnow().isoformat()
    guest_name = clean_text(metadata.get("guest_name")) or customer.username or customer.email
    guest_phone = clean_text(metadata.get("guest_phone")) or ""

    return {
        "guestName": guest_name,
        "phone": guest_phone,
        "idPhotos": json.dumps([]),
        "lastVisit": now_iso,
        "lastMembers": json.dumps([]),
        "source": "customer_portal",
        "customerUserId": str(customer.user_id),
        "customerEmail": customer.email,
    }


def build_hotel_reservation_payload(
    *,
    payment_order: BookingPaymentOrder,
    customer: CustomerContext,
    metadata: dict,
    razorpay_payment_id: str,
) -> tuple[str, dict]:
    now_iso = datetime.utcnow().isoformat()
    nights = max(1, int(to_float(metadata.get("nights")) or 1))
    nightly_rate = to_float(metadata.get("nightly_rate"))
    if nightly_rate is None:
        nightly_rate = round(amount_from_paise(payment_order.amount_paise) / nights, 2)

    reservation_doc_id = uuid.uuid4().hex
    guest_name = clean_text(metadata.get("guest_name")) or customer.username or customer.email
    guest_phone = clean_text(metadata.get("guest_phone")) or ""
    room_type = clean_text(metadata.get("room_type") or metadata.get("preferred_room_type")) or "Standard"
    room_mode = clean_text(metadata.get("room_mode")) or "Standard"
    selected_room_number = clean_text(metadata.get("selected_room_number"))
    selected_room_floor = clean_text(metadata.get("selected_room_floor"))
    selected_room_status = clean_text(metadata.get("selected_room_status"))
    selected_room_notes = clean_text(metadata.get("selected_room_notes"))
    selected_room_id = clean_text(metadata.get("selected_room_id"))
    room_type_images = metadata.get("room_type_images")
    room_type_images = room_type_images if isinstance(room_type_images, list) else []
    selected_room_images = metadata.get("selected_room_images")
    selected_room_images = (
        selected_room_images if isinstance(selected_room_images, list) else []
    )
    room_images = selected_room_images or room_type_images
    room_description = (
        clean_text(metadata.get("selected_room_description"))
        or clean_text(metadata.get("room_type_description"))
        or selected_room_notes
    )

    payload = {
        "guestName": guest_name,
        "phone": guest_phone,
        "mode": room_mode,
        "checkIn": clean_text(metadata.get("check_in")),
        "checkOut": clean_text(metadata.get("check_out")),
        "idFront": "",
        "idBack": "",
        "members": json.dumps([]),
        "idPhotos": json.dumps([]),
        "payments": json.dumps(
            [
                {
                    "method": "Razorpay",
                    "amount": amount_from_paise(payment_order.amount_paise),
                    "date": now_iso,
                    "reference": razorpay_payment_id,
                }
            ]
        ),
        "extras": json.dumps([]),
        "bookingDate": now_iso,
        "batch": f"WEB-{payment_order.id.hex[:10]}",
        "roomNumber": selected_room_number or "TBD",
        "roomType": room_type,
        "pricePerNight": nightly_rate,
        "status": "Reserved",
        "source": "customer_portal",
        "bookingSource": "customer_portal",
        "customerBookingId": str(payment_order.id),
        "customerUserId": str(customer.user_id),
        "customerEmail": customer.email,
        "guestCount": int(to_float(metadata.get("guests")) or 1),
        "nights": nights,
        "specialRequests": clean_text(metadata.get("special_requests")),
        "roomId": selected_room_id,
        "roomFloor": selected_room_floor,
        "roomStatus": selected_room_status,
        "selectedRoomNotes": selected_room_notes,
        "preferredRoomNumber": selected_room_number,
        "roomTypeImage": clean_text(metadata.get("selected_room_image"))
        or clean_text(metadata.get("room_type_image")),
        "roomTypeImages": room_type_images,
        "roomImages": room_images,
        "roomDescription": room_description,
    }
    return reservation_doc_id, payload


async def sync_hotel_booking_documents(
    db: AsyncSession,
    *,
    payment_order: BookingPaymentOrder,
    customer: CustomerContext,
    razorpay_payment_id: str,
) -> dict:
    if not payment_order.tenant_id:
        raise HTTPException(status_code=400, detail="Hotel booking is missing a tenant reference.")

    tenant = (
        await db.execute(
            text("SELECT business_type FROM tenants WHERE id = :tenant_id"),
            {"tenant_id": payment_order.tenant_id},
        )
    ).mappings().first()
    if not tenant or tenant["business_type"] != "hotel":
        raise HTTPException(status_code=400, detail="This payment is not linked to a hotel workspace.")

    metadata = dict(payment_order.details or {})
    if not clean_text(metadata.get("check_in")) or not clean_text(metadata.get("check_out")):
        raise HTTPException(
            status_code=400,
            detail="Hotel booking metadata is missing stay dates.",
        )
    if not clean_text(metadata.get("room_type") or metadata.get("preferred_room_type")):
        raise HTTPException(
            status_code=400,
            detail="Hotel booking metadata is missing the room type.",
        )

    room_payload = await validate_hotel_checkout_room(
        db,
        tenant_id=payment_order.tenant_id,
        metadata=metadata,
    )
    if room_payload:
        metadata["selected_room_id"] = metadata.get("selected_room_id") or clean_text(room_payload.get("id"))
        metadata["selected_room_floor"] = metadata.get("selected_room_floor") or clean_text(room_payload.get("floor"))
        metadata["selected_room_status"] = metadata.get("selected_room_status") or clean_text(room_payload.get("status"))
        metadata["selected_room_notes"] = metadata.get("selected_room_notes") or clean_text(room_payload.get("notes"))
        metadata["selected_room_image"] = metadata.get("selected_room_image") or clean_text(
            room_payload.get("image_url") or room_payload.get("imageUrl")
        )
        metadata["selected_room_images"] = metadata.get("selected_room_images") or list(
            room_payload.get("image_urls") or room_payload.get("imageUrls") or []
        )
        metadata["selected_room_description"] = metadata.get("selected_room_description") or clean_text(room_payload.get("notes"))
        metadata["room_type"] = metadata.get("room_type") or clean_text(room_payload.get("type"))
        metadata["room_mode"] = metadata.get("room_mode") or clean_text(room_payload.get("mode"))

    await upsert_hotel_document(
        db,
        tenant_id=payment_order.tenant_id,
        collection="customers",
        doc_id=f"customer-{customer.user_id}",
        payload=build_hotel_customer_payload(customer, metadata),
    )

    reservation_doc_id, reservation_payload = build_hotel_reservation_payload(
        payment_order=payment_order,
        customer=customer,
        metadata=metadata,
        razorpay_payment_id=razorpay_payment_id,
    )
    await upsert_hotel_document(
        db,
        tenant_id=payment_order.tenant_id,
        collection="reservations",
        doc_id=reservation_doc_id,
        payload=reservation_payload,
    )

    return {
        "reservation_doc_id": reservation_doc_id,
        "status": reservation_payload["status"],
        "room_number": reservation_payload["roomNumber"],
        "room_type": reservation_payload["roomType"],
        "room_mode": reservation_payload["mode"],
        "check_in": reservation_payload["checkIn"],
        "check_out": reservation_payload["checkOut"],
        "nightly_rate": reservation_payload["pricePerNight"],
    }


async def sync_flight_booking_documents(
    db: AsyncSession,
    *,
    payment_order: BookingPaymentOrder,
    customer: CustomerContext,
    razorpay_payment_id: str,
) -> dict:
    if not payment_order.tenant_id:
        raise HTTPException(status_code=400, detail="Flight booking is missing a tenant reference.")

    metadata = dict(payment_order.details or {})
    now_iso = datetime.utcnow().isoformat()

    booking_doc_id = uuid.uuid4().hex
    flight_payload = {
        "customerName": customer.username or customer.email,
        "customerEmail": customer.email,
        "passengerCount": int(to_float(metadata.get("passengers")) or 1),
        "bookingDate": now_iso,
        "status": "Confirmed",
        "flightNumber": clean_text(metadata.get("flight_number")),
        "origin": clean_text(metadata.get("origin")),
        "destination": clean_text(metadata.get("destination")),
        "departureTime": clean_text(metadata.get("departure_time")),
        "arrivalTime": clean_text(metadata.get("arrival_time")),
        "class": clean_text(metadata.get("class")) or "Economy",
        "amount": amount_from_paise(payment_order.amount_paise),
        "razorpayPaymentId": razorpay_payment_id,
        "source": "customer_portal"
    }

    # Save to flight_documents collection "bookings"
    record = FlightDocument(
        tenant_id=payment_order.tenant_id,
        collection="bookings",
        doc_id=booking_doc_id,
        payload=flight_payload,
    )
    db.add(record)
    return {
        "booking_id": booking_doc_id,
        "status": "Confirmed",
        "flight_number": flight_payload["flightNumber"]
    }


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
    checkout_metadata = dict(payload.metadata or {})
    if payload.service_type == "hotel" and payload.tenant_id:
        room_payload = await validate_hotel_checkout_room(
            db,
            tenant_id=payload.tenant_id,
            metadata=checkout_metadata,
        )
        if room_payload:
            checkout_metadata["selected_room_id"] = checkout_metadata.get("selected_room_id") or clean_text(room_payload.get("id"))
            checkout_metadata["selected_room_floor"] = checkout_metadata.get("selected_room_floor") or clean_text(room_payload.get("floor"))
            checkout_metadata["selected_room_status"] = checkout_metadata.get("selected_room_status") or clean_text(room_payload.get("status"))
            checkout_metadata["selected_room_notes"] = checkout_metadata.get("selected_room_notes") or clean_text(room_payload.get("notes"))
            checkout_metadata["selected_room_image"] = checkout_metadata.get("selected_room_image") or clean_text(
                room_payload.get("image_url") or room_payload.get("imageUrl")
            )
            checkout_metadata["selected_room_images"] = checkout_metadata.get("selected_room_images") or list(
                room_payload.get("image_urls") or room_payload.get("imageUrls") or []
            )
            checkout_metadata["room_type"] = checkout_metadata.get("room_type") or clean_text(room_payload.get("type"))
            checkout_metadata["room_mode"] = checkout_metadata.get("room_mode") or clean_text(room_payload.get("mode"))

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
        details=checkout_metadata,
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

    hotel_reservation = None
    flight_booking = None

    if payment_order.service_type == "hotel":
        hotel_reservation = await sync_hotel_booking_documents(
            db,
            payment_order=payment_order,
            customer=customer,
            razorpay_payment_id=payload.razorpay_payment_id,
        )
    elif payment_order.service_type == "flight":
        flight_booking = await sync_flight_booking_documents(
            db,
            payment_order=payment_order,
            customer=customer,
            razorpay_payment_id=payload.razorpay_payment_id,
        )

    booking_metadata = build_booking_details(
        payment_order.details or {},
        payment_details={
            "provider": "razorpay",
            "status": "captured",
            "razorpay_order_id": payload.razorpay_order_id,
            "razorpay_payment_id": payload.razorpay_payment_id,
        },
    )
    if hotel_reservation:
        booking_metadata["hotel_reservation"] = hotel_reservation
    if flight_booking:
        booking_metadata["flight_booking"] = flight_booking

    paid_payload = BookingRequestCreate(
        service_type=payment_order.service_type,
        title=payment_order.title,
        summary=payment_order.summary,
        tenant_id=payment_order.tenant_id,
        tenant_slug=payment_order.tenant_slug,
        tenant_name=payment_order.tenant_name,
        total_amount=amount_from_paise(payment_order.amount_paise),
        currency=payment_order.currency,
        metadata=booking_metadata,
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
