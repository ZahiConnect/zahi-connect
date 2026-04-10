import asyncio
from contextlib import asynccontextmanager
from decimal import Decimal

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from database import Base, get_db, engine
from dependencies import CustomerContext, get_customer_context
from models import BookingRequest
from schemas import BookingRequestCreate, BookingRequestResponse

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

    booking_request = BookingRequest(
        user_id=customer.user_id,
        user_email=customer.email,
        user_name=customer.username or customer.email,
        service_type=payload.service_type,
        title=payload.title,
        summary=payload.summary,
        tenant_id=payload.tenant_id,
        tenant_slug=tenant_slug,
        tenant_name=tenant_name,
        total_amount=payload.total_amount,
        currency=payload.currency.upper(),
        details=payload.metadata,
    )
    db.add(booking_request)
    await db.commit()
    await db.refresh(booking_request)
    return serialize_booking(booking_request)
