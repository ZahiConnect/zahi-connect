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
from sqlalchemy import bindparam, select, text
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

RESTAURANT_BOOKING_STATUS_BY_ORDER_STATUS = {
    "new": "sent_to_kitchen",
    "preparing": "preparing",
    "ready": "ready_for_delivery",
    "out_for_delivery": "out_for_delivery",
    "served": "delivered",
    "completed": "completed",
    "cancelled": "cancelled",
}


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


def restaurant_customer_status(order_status: str | None) -> str:
    return RESTAURANT_BOOKING_STATUS_BY_ORDER_STATUS.get(
        clean_text(order_status) or "",
        "sent_to_kitchen",
    )


def parse_uuid(value, *, field_name: str) -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}.") from exc


async def fetch_customer_delivery_profile(db: AsyncSession, customer: CustomerContext) -> dict:
    row = (
        await db.execute(
            text("SELECT mobile, address FROM users WHERE id = :user_id"),
            {"user_id": customer.user_id},
        )
    ).mappings().first()
    return dict(row or {})


async def create_restaurant_order_for_booking(
    db: AsyncSession,
    *,
    booking_request: BookingRequest,
    customer: CustomerContext,
    metadata: dict,
) -> dict:
    if not booking_request.tenant_id:
        raise HTTPException(status_code=400, detail="Restaurant order is missing a restaurant workspace.")

    tenant = (
        await db.execute(
            text("SELECT business_type FROM tenants WHERE id = :tenant_id"),
            {"tenant_id": booking_request.tenant_id},
        )
    ).mappings().first()
    if not tenant or tenant["business_type"] != "restaurant":
        raise HTTPException(status_code=400, detail="This request is not linked to a restaurant workspace.")

    cart_items = metadata.get("items") if isinstance(metadata, dict) else None
    if not isinstance(cart_items, list) or not cart_items:
        raise HTTPException(status_code=400, detail="Restaurant order needs at least one menu item.")

    item_quantities: dict[uuid.UUID, int] = {}
    item_notes: dict[uuid.UUID, str | None] = {}
    for item in cart_items:
        if not isinstance(item, dict):
            continue
        menu_item_id = parse_uuid(
            item.get("menu_item_id") or item.get("id"),
            field_name="restaurant menu item",
        )
        quantity = int(to_float(item.get("quantity")) or 1)
        if quantity < 1:
            raise HTTPException(status_code=400, detail="Restaurant item quantity must be at least 1.")
        item_quantities[menu_item_id] = item_quantities.get(menu_item_id, 0) + quantity
        item_notes[menu_item_id] = clean_text(item.get("special_instructions") or item.get("notes"))

    if not item_quantities:
        raise HTTPException(status_code=400, detail="Restaurant order needs at least one menu item.")

    menu_query = text(
        """
        SELECT id, name, is_available, dine_in_price, delivery_price
        FROM menu_items
        WHERE tenant_id = :tenant_id AND id IN :item_ids
        """
    ).bindparams(bindparam("item_ids", expanding=True))
    menu_rows = (
        await db.execute(
            menu_query,
            {"tenant_id": booking_request.tenant_id, "item_ids": list(item_quantities.keys())},
        )
    ).mappings().all()
    menu_items = {row["id"]: row for row in menu_rows}

    missing_ids = [str(item_id) for item_id in item_quantities if item_id not in menu_items]
    if missing_ids:
        raise HTTPException(status_code=404, detail=f"Menu items not found: {', '.join(missing_ids)}")

    order_id = uuid.uuid4()
    profile = await fetch_customer_delivery_profile(db, customer)
    customer_name = clean_text(customer.username) or clean_text(booking_request.user_name) or customer.email
    customer_phone = (
        clean_text(metadata.get("customer_phone"))
        or clean_text(metadata.get("phone"))
        or clean_text(profile.get("mobile"))
    )
    if customer_phone:
        customer_phone = customer_phone[:15]
    delivery_address = (
        clean_text(metadata.get("delivery_address"))
        or clean_text(metadata.get("customer_address"))
        or clean_text(metadata.get("location_label"))
        or clean_text(profile.get("address"))
        or "Customer delivery address not provided"
    )
    special_instructions = clean_text(metadata.get("notes"))
    if special_instructions:
        special_instructions = f"{special_instructions}\nCustomer booking: {booking_request.id}"
    else:
        special_instructions = f"Customer booking: {booking_request.id}"

    total = Decimal("0")
    order_lines = []
    for menu_item_id, quantity in item_quantities.items():
        menu_item = menu_items[menu_item_id]
        if not menu_item["is_available"]:
            raise HTTPException(status_code=400, detail=f"'{menu_item['name']}' is currently unavailable.")

        unit_price = menu_item["delivery_price"] if menu_item["delivery_price"] is not None else menu_item["dine_in_price"]
        unit_price = Decimal(str(unit_price or 0))
        total += unit_price * quantity
        order_lines.append(
            {
                "id": uuid.uuid4(),
                "menu_item_id": menu_item_id,
                "item_name": menu_item["name"],
                "quantity": quantity,
                "unit_price": unit_price,
                "special_instructions": item_notes.get(menu_item_id),
            }
        )

    delivery_fee = Decimal(str(to_float(metadata.get("delivery_fee")) or 0))
    total += delivery_fee

    await db.execute(
        text(
            """
            INSERT INTO orders (
                id, tenant_id, table_id, order_type, status, customer_name,
                customer_phone, delivery_address, total_amount, special_instructions,
                created_at, updated_at
            )
            VALUES (
                :id, :tenant_id, NULL, 'delivery', 'new', :customer_name,
                :customer_phone, :delivery_address, :total_amount, :special_instructions,
                NOW(), NOW()
            )
            """
        ),
        {
            "id": order_id,
            "tenant_id": booking_request.tenant_id,
            "customer_name": customer_name,
            "customer_phone": customer_phone,
            "delivery_address": delivery_address,
            "total_amount": total,
            "special_instructions": special_instructions,
        },
    )

    for line in order_lines:
        await db.execute(
            text(
                """
                INSERT INTO order_items (
                    id, order_id, menu_item_id, item_name, quantity,
                    unit_price, special_instructions, created_at
                )
                VALUES (
                    :id, :order_id, :menu_item_id, :item_name, :quantity,
                    :unit_price, :special_instructions, NOW()
                )
                """
            ),
            {
                **line,
                "order_id": order_id,
            },
        )

    return {
        "order_id": str(order_id),
        "status": "new",
        "customer_status": restaurant_customer_status("new"),
        "order_type": "delivery",
        "delivery_address": delivery_address,
        "delivery_fee": float(delivery_fee),
        "total_amount": float(total),
    }


async def hydrate_restaurant_order_statuses(
    db: AsyncSession,
    serialized_records: list[dict],
) -> list[dict]:
    order_ids = []
    for record in serialized_records:
        order_id = (record.get("metadata") or {}).get("restaurant_order", {}).get("order_id")
        if not order_id:
            continue
        try:
            order_ids.append(uuid.UUID(str(order_id)))
        except ValueError:
            continue

    if not order_ids:
        return serialized_records

    order_query = text(
        """
        SELECT id, status, service_assignee, bill_number, updated_at
        FROM orders
        WHERE id IN :order_ids
        """
    ).bindparams(bindparam("order_ids", expanding=True))
    order_rows = (
        await db.execute(order_query, {"order_ids": list(dict.fromkeys(order_ids))})
    ).mappings().all()
    orders_by_id = {str(row["id"]): row for row in order_rows}

    for record in serialized_records:
        metadata = dict(record.get("metadata") or {})
        restaurant_order = dict(metadata.get("restaurant_order") or {})
        order = orders_by_id.get(str(restaurant_order.get("order_id")))
        if not order:
            continue

        customer_status = restaurant_customer_status(order["status"])
        restaurant_order.update(
            {
                "status": order["status"],
                "customer_status": customer_status,
                "service_assignee": order["service_assignee"],
                "bill_number": order["bill_number"],
                "updated_at": order["updated_at"].isoformat() if order["updated_at"] else None,
            }
        )
        metadata["restaurant_order"] = restaurant_order
        record["metadata"] = metadata
        record["status"] = customer_status

    return serialized_records


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

    check_in_date = clean_text(metadata.get("check_in")) or ""
    check_out_date = clean_text(metadata.get("check_out")) or ""
    check_in_time = clean_text(metadata.get("check_in_time")) or "14:00"
    check_out_time = clean_text(metadata.get("check_out_time")) or "11:00"

    # Append hotel times to date-only values so admin dashboard shows proper datetimes
    if check_in_date and "T" not in check_in_date:
        check_in_date = f"{check_in_date}T{check_in_time}"
    if check_out_date and "T" not in check_out_date:
        check_out_date = f"{check_out_date}T{check_out_time}"

    payload = {
        "guestName": guest_name,
        "phone": guest_phone,
        "mode": room_mode,
        "checkIn": check_in_date,
        "checkOut": check_out_date,
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
        "status": "Occupied",
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
        collection="bookings",
        doc_id=reservation_doc_id,
        payload=reservation_payload,
    )

    # Mark the selected room as Occupied so the admin dashboard reflects the paid stay.
    selected_room_number = clean_text(metadata.get("selected_room_number"))
    if selected_room_number and room_payload:
        await upsert_hotel_document(
            db,
            tenant_id=payment_order.tenant_id,
            collection="rooms",
            doc_id=selected_room_number,
            payload={"status": "Occupied"},
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
    serialized_records = [serialize_booking(record) for record in records]
    return await hydrate_restaurant_order_statuses(db, serialized_records)


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

    try:
        db.add(booking_request)
        await db.flush()

        if payload.service_type == "restaurant":
            metadata = dict(booking_request.details or {})
            restaurant_order = await create_restaurant_order_for_booking(
                db,
                booking_request=booking_request,
                customer=customer,
                metadata=metadata,
            )
            metadata["restaurant_order"] = restaurant_order
            booking_request.details = metadata
            booking_request.status = restaurant_order["customer_status"]

        await db.commit()
    except Exception:
        await db.rollback()
        raise

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

    try:
        db.add(booking_request)
        await db.flush()

        if payment_order.service_type == "restaurant":
            metadata = dict(booking_request.details or {})
            restaurant_order = await create_restaurant_order_for_booking(
                db,
                booking_request=booking_request,
                customer=customer,
                metadata=metadata,
            )
            metadata["restaurant_order"] = restaurant_order
            booking_request.details = metadata
            booking_request.status = restaurant_order["customer_status"]

        payment_order.booking_request_id = booking_request.id
        payment_order.razorpay_payment_id = payload.razorpay_payment_id
        payment_order.status = "paid"

        await db.commit()
    except Exception:
        await db.rollback()
        raise

    await db.refresh(booking_request)
    return serialize_booking(booking_request)
