import asyncio
import re
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import cloudinary
import cloudinary.uploader
from fastapi import Depends, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import bindparam, delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import Base, engine, get_db
from dependencies import FlightWorkspaceContext, get_flight_context
from models import FlightDocument
from schemas import QueryRequest

STARTUP_DB_RETRIES = 15
STARTUP_DB_RETRY_DELAY_SECONDS = 2
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
}
MAX_IMAGE_SIZE = 10 * 1024 * 1024


def ensure_upload_dir():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


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
                "[startup] flight database not ready "
                f"(attempt {attempt}/{STARTUP_DB_RETRIES}): {exc}"
            )
            if attempt == STARTUP_DB_RETRIES:
                raise
            await asyncio.sleep(STARTUP_DB_RETRY_DELAY_SECONDS)

    raise last_error


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_upload_dir()
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )
    await initialize_database()
    yield


ensure_upload_dir()

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/flight/docs",
    openapi_url="/flight/openapi.json",
    redoc_url="/flight/redoc",
    lifespan=lifespan,
)

app.mount("/flight/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="flight_uploads")

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


def serialize_document(record: FlightDocument) -> dict[str, Any]:
    payload = dict(record.payload or {})
    payload["id"] = record.doc_id
    return payload


def try_number(value: Any):
    if isinstance(value, bool):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def comparable_value(value: Any):
    numeric = try_number(value)
    if numeric is not None:
        return numeric
    if value is None:
        return ""
    return str(value).strip().lower()


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text_value = str(value).strip()
    return text_value or None


def normalize_booking_seats(value: Any) -> list[str]:
    if isinstance(value, list):
        raw_values = value
    else:
        raw_text = clean_text(value)
        if not raw_text:
            return []
        raw_values = re.split(r"[,/|\s]+", raw_text)

    seats: list[str] = []
    for item in raw_values:
        seat = clean_text(item)
        if seat and seat.upper() not in seats:
            seats.append(seat.upper())
    return seats


def normalize_booking_cabin(value: Any) -> str:
    cabin = (clean_text(value) or "Economy").lower()
    if "business" in cabin:
        return "Business"
    if "first" in cabin:
        return "First"
    return "Economy"


def apply_flight_payment_metadata(doc: dict[str, Any], metadata: dict[str, Any]) -> dict[str, Any]:
    if not metadata:
        return doc

    seats = normalize_booking_seats(
        doc.get("seats")
        or doc.get("seatNumber")
        or doc.get("seat_number")
        or metadata.get("seats")
        or metadata.get("seatNumber")
    )
    enriched = dict(doc)
    enriched["passengerName"] = (
        clean_text(enriched.get("passengerName"))
        or clean_text(metadata.get("lead_passenger"))
        or clean_text(metadata.get("passenger_name"))
        or clean_text(enriched.get("customerName"))
        or "Guest Passenger"
    )
    enriched["phone"] = (
        clean_text(enriched.get("phone"))
        or clean_text(metadata.get("contact_number"))
        or clean_text(metadata.get("phone"))
        or ""
    )
    enriched["email"] = (
        clean_text(enriched.get("email"))
        or clean_text(enriched.get("customerEmail"))
        or clean_text(metadata.get("email"))
        or ""
    )
    enriched["flightNumber"] = clean_text(enriched.get("flightNumber")) or clean_text(metadata.get("flight_number"))
    booking_date = clean_text(enriched.get("bookingDate"))
    enriched["date"] = (
        clean_text(enriched.get("date"))
        or clean_text(metadata.get("date"))
        or clean_text(metadata.get("departure_date"))
        or (booking_date[:10] if booking_date else "")
    )
    enriched["travellers"] = enriched.get("travellers") or metadata.get("passengers") or enriched.get("passengerCount") or 1
    enriched["class"] = normalize_booking_cabin(enriched.get("class") or metadata.get("class"))
    enriched["seats"] = seats
    enriched["seatNumber"] = ", ".join(seats)
    enriched["originCode"] = clean_text(enriched.get("originCode")) or clean_text(metadata.get("origin_code"))
    enriched["destinationCode"] = clean_text(enriched.get("destinationCode")) or clean_text(metadata.get("destination_code"))
    return enriched


async def enrich_booking_documents_from_payments(
    db: AsyncSession,
    tenant_id,
    docs: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    payment_ids = [
        clean_text(doc.get("razorpayPaymentId"))
        for doc in docs
        if clean_text(doc.get("razorpayPaymentId"))
    ]
    if not payment_ids:
        return docs

    table_exists = (
        await db.execute(text("SELECT to_regclass('public.booking_payment_orders')"))
    ).scalar_one_or_none()
    if not table_exists:
        return docs

    rows = (
        await db.execute(
            text(
                """
                SELECT razorpay_payment_id, metadata
                FROM booking_payment_orders
                WHERE tenant_id = :tenant_id
                  AND service_type = 'flight'
                  AND razorpay_payment_id IN :payment_ids
                """
            ).bindparams(bindparam("payment_ids", expanding=True)),
            {"tenant_id": tenant_id, "payment_ids": list(dict.fromkeys(payment_ids))},
        )
    ).mappings().all()

    metadata_by_payment = {
        clean_text(row["razorpay_payment_id"]): dict(row.get("metadata") or {})
        for row in rows
        if clean_text(row["razorpay_payment_id"])
    }
    return [
        apply_flight_payment_metadata(
            doc,
            metadata_by_payment.get(clean_text(doc.get("razorpayPaymentId")), {}),
        )
        for doc in docs
    ]


def matches_filter(doc: dict[str, Any], field: str, operator: str, expected: Any) -> bool:
    actual = doc.get(field)
    op = operator.lower()

    if op in {"=", "=="}:
        return comparable_value(actual) == comparable_value(expected)
    if op in {"!=", "<>"}:
        return comparable_value(actual) != comparable_value(expected)
    if op == "contains":
        return str(expected).lower() in str(actual or "").lower()
    if op == "in":
        options = expected if isinstance(expected, list) else [expected]
        return comparable_value(actual) in {comparable_value(option) for option in options}

    actual_num = try_number(actual)
    expected_num = try_number(expected)
    left = actual_num if actual_num is not None else comparable_value(actual)
    right = expected_num if expected_num is not None else comparable_value(expected)

    if op == ">":
        return left > right
    if op == ">=":
        return left >= right
    if op == "<":
        return left < right
    if op == "<=":
        return left <= right

    return False


async def get_collection_documents(
    db: AsyncSession,
    tenant_id,
    collection: str,
) -> list[dict[str, Any]]:
    result = await db.execute(
        select(FlightDocument)
        .where(FlightDocument.tenant_id == tenant_id, FlightDocument.collection == collection)
        .order_by(FlightDocument.updated_at.desc())
    )
    records = result.scalars().all()
    docs = [serialize_document(record) for record in records]
    if collection == "bookings":
        return await enrich_booking_documents_from_payments(db, tenant_id, docs)
    return docs


def apply_query(docs: list[dict[str, Any]], query: QueryRequest) -> list[dict[str, Any]]:
    filtered = docs
    for current_filter in query.filters:
        filtered = [
            doc
            for doc in filtered
            if matches_filter(
                doc,
                current_filter.field,
                current_filter.operator,
                current_filter.value,
            )
        ]

    if query.sort_field:
        reverse = query.sort_direction.upper() == "DESC"
        filtered = sorted(
            filtered,
            key=lambda item: comparable_value(item.get(query.sort_field)),
            reverse=reverse,
        )

    start = max(query.offset, 0)
    end = start + max(query.limit, 0)
    return filtered[start:end]


async def upsert_document_record(
    db: AsyncSession,
    tenant_id,
    collection: str,
    doc_id: str,
    payload: dict[str, Any],
) -> dict[str, Any]:
    result = await db.execute(
        select(FlightDocument).where(
            FlightDocument.tenant_id == tenant_id,
            FlightDocument.collection == collection,
            FlightDocument.doc_id == doc_id,
        )
    )
    record = result.scalar_one_or_none()
    normalized_payload = dict(payload or {})
    normalized_payload["id"] = doc_id

    if record:
        record.payload = normalized_payload
    else:
        record = FlightDocument(
            tenant_id=tenant_id,
            collection=collection,
            doc_id=doc_id,
            payload=normalized_payload,
        )
        db.add(record)

    await db.commit()
    await db.refresh(record)
    return serialize_document(record)


async def get_document_or_404(
    db: AsyncSession,
    tenant_id,
    collection: str,
    doc_id: str,
) -> FlightDocument:
    result = await db.execute(
        select(FlightDocument).where(
            FlightDocument.tenant_id == tenant_id,
            FlightDocument.collection == collection,
            FlightDocument.doc_id == doc_id,
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Document not found")
    return record


def sanitize_filename(filename: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9._-]+", "-", filename).strip("-")
    return safe or "image"


@app.get("/flight")
async def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}


@app.post("/flight/collections/{collection}")
async def create_collection(collection: str, _: FlightWorkspaceContext = Depends(get_flight_context)):
    return {"status": "ok", "collection": collection}


@app.get("/flight/collections/{collection}")
async def read_collection(
    collection: str,
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
    context: FlightWorkspaceContext = Depends(get_flight_context),
):
    docs = await get_collection_documents(db, context.tenant_id, collection)
    sliced = docs[max(offset, 0) : max(offset, 0) + max(limit, 0)]
    return {"data": sliced, "total": len(docs), "limit": limit, "offset": offset}


@app.delete("/flight/collections/{collection}")
async def delete_collection(
    collection: str,
    db: AsyncSession = Depends(get_db),
    context: FlightWorkspaceContext = Depends(get_flight_context),
):
    result = await db.execute(
        delete(FlightDocument).where(
            FlightDocument.tenant_id == context.tenant_id,
            FlightDocument.collection == collection,
        )
    )
    await db.commit()
    return {"status": "deleted", "count": result.rowcount or 0}


@app.post("/flight/doc/{collection}")
async def add_auto_id_document(
    collection: str,
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    context: FlightWorkspaceContext = Depends(get_flight_context),
):
    doc_id = uuid.uuid4().hex
    saved = await upsert_document_record(db, context.tenant_id, collection, doc_id, payload)
    return {"status": "created", "id": doc_id, "data": saved}


@app.post("/flight/doc/{collection}/{doc_id}")
async def upsert_document(
    collection: str,
    doc_id: str,
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    context: FlightWorkspaceContext = Depends(get_flight_context),
):
    saved = await upsert_document_record(db, context.tenant_id, collection, doc_id, payload)
    return {"status": "ok", "id": doc_id, "data": saved}


@app.get("/flight/doc/{collection}/{doc_id}")
async def read_document(
    collection: str,
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    context: FlightWorkspaceContext = Depends(get_flight_context),
):
    record = await get_document_or_404(db, context.tenant_id, collection, doc_id)
    return serialize_document(record)


@app.patch("/flight/doc/{collection}/{doc_id}")
async def patch_document(
    collection: str,
    doc_id: str,
    payload: dict[str, Any],
    db: AsyncSession = Depends(get_db),
    context: FlightWorkspaceContext = Depends(get_flight_context),
):
    record = await get_document_or_404(db, context.tenant_id, collection, doc_id)
    merged = dict(record.payload or {})
    merged.update(payload or {})
    saved = await upsert_document_record(db, context.tenant_id, collection, doc_id, merged)
    return saved


@app.delete("/flight/doc/{collection}/{doc_id}")
async def delete_document(
    collection: str,
    doc_id: str,
    db: AsyncSession = Depends(get_db),
    context: FlightWorkspaceContext = Depends(get_flight_context),
):
    record = await get_document_or_404(db, context.tenant_id, collection, doc_id)
    await db.delete(record)
    await db.commit()
    return {"status": "deleted", "id": doc_id}


@app.post("/flight/query/{collection}")
async def query_documents(
    collection: str,
    query: QueryRequest,
    db: AsyncSession = Depends(get_db),
    context: FlightWorkspaceContext = Depends(get_flight_context),
):
    docs = await get_collection_documents(db, context.tenant_id, collection)
    total = len(docs)
    matched = apply_query(docs, query)
    return {"data": matched, "total": total}


@app.post("/flight/images/upload")
async def upload_image(
    file: UploadFile = File(...),
    context: FlightWorkspaceContext = Depends(get_flight_context),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported image type.")

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="File too large.")

    if not (
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    ):
        raise HTTPException(
            status_code=500,
            detail="Cloud image upload is not configured for the flight service.",
        )

    try:
        upload_result = cloudinary.uploader.upload(
            content,
            folder=f"zahi_connect/flights/{context.tenant_id}/media",
            public_id=f"{uuid.uuid4().hex}-{sanitize_filename(Path(file.filename or 'image').stem)}",
            overwrite=False,
            resource_type="image",
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {exc}") from exc

    secure_url = upload_result.get("secure_url")
    if not secure_url:
        raise HTTPException(status_code=500, detail="Image upload failed.")

    return {
        "status": "success",
        "filename": file.filename or "image",
        "size": len(content),
        "url": secure_url,
    }
