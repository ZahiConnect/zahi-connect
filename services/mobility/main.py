import asyncio
import json
import math
import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path

import cloudinary
import cloudinary.uploader
from fastapi import Depends, FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from sqlalchemy import func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from config import settings
from database import Base, engine, get_db
from dependencies import (
    create_access_token,
    get_current_driver,
    hash_password,
    verify_password,
)
from models import MobilityDriver, MobilityRideLead, MobilityVehicle
from schemas import (
    DriverLoginSchema,
    DriverProfileUpdateSchema,
    DriverRegisterSchema,
    DriverStatusSchema,
    GoogleTokenSchema,
    RideRequestCreateSchema,
    VehicleUpsertSchema,
)

STARTUP_DB_RETRIES = 15
STARTUP_DB_RETRY_DELAY_SECONDS = 2
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
ALLOWED_IMAGE_TYPES = {
    "image/avif",
    "image/bmp",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/heic",
    "image/heif",
    "image/jfif",
    "image/pjpeg",
    "image/tiff",
    "image/x-png",
    "image/webp",
    "image/svg+xml",
}
ALLOWED_IMAGE_EXTENSIONS = {
    ".avif",
    ".bmp",
    ".gif",
    ".heic",
    ".heif",
    ".jfif",
    ".jpeg",
    ".jpg",
    ".png",
    ".svg",
    ".tif",
    ".tiff",
    ".webp",
}
MAX_IMAGE_SIZE = 10 * 1024 * 1024
COMMISSION_RATE = 0.12
DRIVER_REQUEST_RADIUS_KM = 30.0
RIDE_STATUSES_VISIBLE_TO_DRIVER = ("pending", "accepted", "completed")
RIDE_TIERS = {
    "tier_1": {"label": "Tier 1", "per_km_rate": 20.0, "min_passengers": 1, "max_passengers": 3},
    "tier_2": {"label": "Tier 2", "per_km_rate": 50.0, "min_passengers": 4, "max_passengers": 5},
    "tier_3": {"label": "Tier 3", "per_km_rate": 100.0, "min_passengers": 6, "max_passengers": 8},
}


def ensure_upload_dir():
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def ensure_mobility_schema_columns(conn):
    statements = [
        """
        ALTER TABLE mobility_ride_leads
        ADD COLUMN IF NOT EXISTS requested_driver_id UUID NULL
        REFERENCES mobility_drivers(id) ON DELETE SET NULL
        """,
        "ALTER TABLE mobility_ride_leads ADD COLUMN IF NOT EXISTS tier_key VARCHAR(40) NOT NULL DEFAULT 'tier_1'",
        "ALTER TABLE mobility_ride_leads ADD COLUMN IF NOT EXISTS tier_label VARCHAR(80) NOT NULL DEFAULT 'Tier 1'",
        "ALTER TABLE mobility_ride_leads ADD COLUMN IF NOT EXISTS tier_radius_km DOUBLE PRECISION NOT NULL DEFAULT 30.0",
        "ALTER TABLE mobility_ride_leads ALTER COLUMN tier_radius_km SET DEFAULT 30.0",
        "UPDATE mobility_ride_leads SET tier_radius_km = 30.0 WHERE tier_radius_km IS NULL OR tier_radius_km < 30.0",
        "ALTER TABLE mobility_ride_leads ADD COLUMN IF NOT EXISTS tier_fare DOUBLE PRECISION NOT NULL DEFAULT 20.0",
        "ALTER TABLE mobility_ride_leads ADD COLUMN IF NOT EXISTS trip_distance_km DOUBLE PRECISION NULL",
        "ALTER TABLE mobility_ride_leads ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP NULL",
        "CREATE INDEX IF NOT EXISTS ix_mobility_ride_leads_requested_driver_id ON mobility_ride_leads (requested_driver_id)",
        "ALTER TABLE mobility_vehicles ADD COLUMN IF NOT EXISTS photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb",
        "ALTER TABLE mobility_vehicles ADD COLUMN IF NOT EXISTS rc_image_urls JSONB NOT NULL DEFAULT '[]'::jsonb",
        "ALTER TABLE mobility_vehicles ADD COLUMN IF NOT EXISTS insurance_image_urls JSONB NOT NULL DEFAULT '[]'::jsonb",
        "UPDATE mobility_vehicles SET photo_urls = '[]'::jsonb WHERE photo_urls IS NULL",
        "UPDATE mobility_vehicles SET rc_image_urls = '[]'::jsonb WHERE rc_image_urls IS NULL",
        "UPDATE mobility_vehicles SET insurance_image_urls = '[]'::jsonb WHERE insurance_image_urls IS NULL",
        "ALTER TABLE mobility_drivers ALTER COLUMN phone DROP NOT NULL",
        "UPDATE mobility_drivers SET phone = NULL WHERE btrim(phone) = ''",
    ]

    for statement in statements:
        await conn.execute(text(statement))


async def initialize_database():
    last_error = None

    for attempt in range(1, STARTUP_DB_RETRIES + 1):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                await ensure_mobility_schema_columns(conn)
            return
        except Exception as exc:
            last_error = exc
            print(
                "[startup] mobility database not ready "
                f"(attempt {attempt}/{STARTUP_DB_RETRIES}): {exc}"
            )
            if attempt == STARTUP_DB_RETRIES:
                raise
            await asyncio.sleep(STARTUP_DB_RETRY_DELAY_SECONDS)

    raise last_error


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_upload_dir()
    if (
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    ):
        cloudinary.config(
            cloud_name=settings.CLOUDINARY_CLOUD_NAME,
            api_key=settings.CLOUDINARY_API_KEY,
            api_secret=settings.CLOUDINARY_API_SECRET,
        )
    await initialize_database()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/mobility/docs",
    openapi_url="/mobility/openapi.json",
    redoc_url="/mobility/redoc",
    lifespan=lifespan,
)

ensure_upload_dir()
app.mount("/mobility/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="mobility_uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:4173",
        "http://localhost:4174",
        "http://localhost:4175",
        "http://localhost:4176",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:4174",
        "http://127.0.0.1:4175",
        "http://127.0.0.1:4176",
        "http://localhost:3000",
        "http://localhost:8080",
    ],
    allow_origin_regex=(
        r"^https?://"
        r"(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|"
        r"172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})"
        r"(?::(?:3000|4173|4174|4175|4176|5173|5174|5175|5176|8080))?$"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def sanitize_filename(filename: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9._-]+", "-", filename).strip("-")
    return safe or "image"


def build_public_asset_url(filename: str) -> str:
    return f"/mobility/uploads/{filename}"


def is_allowed_image_upload(file: UploadFile) -> bool:
    content_type = clean_text(file.content_type).lower()
    if content_type in ALLOWED_IMAGE_TYPES:
        return True

    extension = Path(file.filename or "").suffix.lower()
    if content_type in {"", "application/octet-stream"}:
        return extension in ALLOWED_IMAGE_EXTENSIONS

    return content_type.startswith("image/") and extension in ALLOWED_IMAGE_EXTENSIONS


def clean_text(value) -> str:
    return str(value or "").strip()


def normalize_image_urls(value, limit: int = 12) -> list[str]:
    if not isinstance(value, list):
        return []

    normalized = []
    seen = set()
    for item in value:
        url = clean_text(item)
        if not url or url in seen:
            continue

        seen.add(url)
        normalized.append(url)

        if len(normalized) >= limit:
            break

    return normalized


def merge_primary_image_url(primary_url, urls) -> list[str]:
    normalized = normalize_image_urls(urls)
    primary = clean_text(primary_url)
    if primary and primary not in normalized:
        normalized.insert(0, primary)
    return normalized[:12]


def parse_uuid(value, field_name: str = "identifier") -> uuid.UUID:
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}.") from exc


def resolve_ride_tier(payload: RideRequestCreateSchema) -> dict:
    tier_key = clean_text(payload.tier_key) or "tier_1"
    if tier_key not in RIDE_TIERS:
        tier_key = "tier_1"
    tier = RIDE_TIERS[tier_key]
    return {
        "key": tier_key,
        "label": tier["label"],
        "radius_km": DRIVER_REQUEST_RADIUS_KM,
        "fare": tier["per_km_rate"],
        "min_passengers": tier["min_passengers"],
        "max_passengers": tier["max_passengers"],
    }


def vehicle_matches_tier_and_passengers(
    vehicle: MobilityVehicle | None,
    passengers: int,
    tier: dict | None = None,
) -> bool:
    if not vehicle:
        return False

    seat_capacity = int(vehicle.seat_capacity or 0)
    if seat_capacity < passengers:
        return False

    if not tier:
        return True

    return (
        int(tier["min_passengers"]) <= seat_capacity <= int(tier["max_passengers"])
        and int(tier["min_passengers"]) <= passengers <= int(tier["max_passengers"])
    )


def resolve_trip_distance_km(payload: RideRequestCreateSchema) -> float | None:
    if payload.trip_distance_km is not None and payload.trip_distance_km > 0:
        return round(float(payload.trip_distance_km), 2)

    if None not in (
        payload.pickup_latitude,
        payload.pickup_longitude,
        payload.drop_latitude,
        payload.drop_longitude,
    ):
        return round(
            haversine_distance_km(
                payload.pickup_latitude,
                payload.pickup_longitude,
                payload.drop_latitude,
                payload.drop_longitude,
            ),
            2,
        )

    return None


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_km = 6371.0
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    d_lat = lat2_rad - lat1_rad
    d_lon = lon2_rad - lon1_rad
    a = (
        math.sin(d_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_km * c


def online_readiness_issues(driver: MobilityDriver) -> list[str]:
    issues: list[str] = []
    vehicle = driver.vehicle

    if not clean_text(driver.phone):
        issues.append("Complete your profile phone number before going online.")
    if not vehicle:
        issues.append("Add vehicle details before going online.")
        return issues

    if not clean_text(vehicle.vehicle_name):
        issues.append("Add your vehicle name before going online.")
    if not clean_text(vehicle.plate_number):
        issues.append("Add your plate number before going online.")
    if not vehicle.seat_capacity or vehicle.seat_capacity < 1:
        issues.append("Add a valid seat capacity before going online.")
    return issues


def location_readiness_issues(
    driver: MobilityDriver,
    full_name: str | None = None,
    phone: str | None = None,
) -> list[str]:
    issues: list[str] = []
    vehicle = driver.vehicle
    profile_name = driver.full_name if full_name is None else full_name
    profile_phone = driver.phone if phone is None else phone

    if not clean_text(profile_name) or not clean_text(profile_phone):
        issues.append("Complete My Profile before setting your service location.")

    if not vehicle:
        issues.append("Add My Vehicle before setting your service location.")
        return issues

    if not clean_text(vehicle.vehicle_name) or not clean_text(vehicle.plate_number):
        issues.append("Complete My Vehicle before setting your service location.")

    return issues


def serialize_vehicle(vehicle: MobilityVehicle | None) -> dict | None:
    if not vehicle:
        return None
    photo_urls = merge_primary_image_url(vehicle.photo_url, vehicle.photo_urls)
    rc_image_urls = merge_primary_image_url(vehicle.rc_image_url, vehicle.rc_image_urls)
    insurance_image_urls = merge_primary_image_url(
        vehicle.insurance_image_url,
        vehicle.insurance_image_urls,
    )
    return {
        "id": str(vehicle.id),
        "vehicle_name": vehicle.vehicle_name,
        "vehicle_type": vehicle.vehicle_type,
        "brand": vehicle.brand,
        "model": vehicle.model,
        "plate_number": vehicle.plate_number,
        "color": vehicle.color,
        "year": vehicle.year,
        "seat_capacity": vehicle.seat_capacity,
        "air_conditioned": vehicle.air_conditioned,
        "photo_url": photo_urls[0] if photo_urls else None,
        "rc_image_url": rc_image_urls[0] if rc_image_urls else None,
        "insurance_image_url": insurance_image_urls[0] if insurance_image_urls else None,
        "photo_urls": photo_urls,
        "rc_image_urls": rc_image_urls,
        "insurance_image_urls": insurance_image_urls,
        "availability_notes": vehicle.availability_notes,
        "base_fare": vehicle.base_fare,
        "per_km_rate": vehicle.per_km_rate,
    }


def serialize_driver(driver: MobilityDriver, include_private: bool = True) -> dict:
    payload = {
        "id": str(driver.id),
        "full_name": driver.full_name,
        "email": driver.email if include_private else None,
        "phone": driver.phone,
        "profile_photo_url": driver.profile_photo_url,
        "current_area_label": driver.current_area_label,
        "current_latitude": driver.current_latitude,
        "current_longitude": driver.current_longitude,
        "is_online": driver.is_online,
        "is_active": driver.is_active,
        "status": driver.status,
        "rating": driver.rating,
        "last_seen_at": driver.last_seen_at.isoformat() if driver.last_seen_at else None,
        "created_at": driver.created_at.isoformat() if driver.created_at else None,
        "vehicle": serialize_vehicle(driver.vehicle),
    }
    if include_private:
        payload.update(
            {
                "aadhaar_number": driver.aadhaar_number,
                "aadhaar_image_url": driver.aadhaar_image_url,
                "license_number": driver.license_number,
                "license_image_url": driver.license_image_url,
                "emergency_contact_name": driver.emergency_contact_name,
                "emergency_contact_phone": driver.emergency_contact_phone,
            }
        )
    return payload


def serialize_ride_lead(ride_lead: MobilityRideLead) -> dict:
    assigned_driver = serialize_driver(ride_lead.driver, include_private=False) if ride_lead.driver else None
    return {
        "id": str(ride_lead.id),
        "requested_driver_id": str(ride_lead.requested_driver_id) if ride_lead.requested_driver_id else None,
        "assigned_driver_id": str(ride_lead.assigned_driver_id) if ride_lead.assigned_driver_id else None,
        "assigned_driver": assigned_driver,
        "customer_user_id": ride_lead.customer_user_id,
        "customer_name": ride_lead.customer_name,
        "customer_email": ride_lead.customer_email,
        "customer_phone": ride_lead.customer_phone,
        "pickup_label": ride_lead.pickup_label,
        "drop_label": ride_lead.drop_label,
        "pickup_latitude": ride_lead.pickup_latitude,
        "pickup_longitude": ride_lead.pickup_longitude,
        "drop_latitude": ride_lead.drop_latitude,
        "drop_longitude": ride_lead.drop_longitude,
        "passengers": ride_lead.passengers,
        "tier_key": ride_lead.tier_key,
        "tier_label": ride_lead.tier_label,
        "tier_radius_km": ride_lead.tier_radius_km,
        "tier_per_km_rate": ride_lead.tier_fare,
        "tier_fare": ride_lead.tier_fare,
        "trip_distance_km": ride_lead.trip_distance_km,
        "estimated_fare": ride_lead.estimated_fare,
        "commission_amount": ride_lead.commission_amount,
        "payment_status": ride_lead.payment_status,
        "status": ride_lead.status,
        "source": ride_lead.source,
        "notes": ride_lead.notes,
        "accepted_at": ride_lead.accepted_at.isoformat() if ride_lead.accepted_at else None,
        "created_at": ride_lead.created_at.isoformat() if ride_lead.created_at else None,
    }


def compute_estimated_fare(
    vehicle: MobilityVehicle | None,
    pickup_latitude: float | None,
    pickup_longitude: float | None,
    drop_latitude: float | None,
    drop_longitude: float | None,
) -> float:
    base_fare = vehicle.base_fare if vehicle else 250.0
    per_km_rate = vehicle.per_km_rate if vehicle else 18.0

    if None not in (pickup_latitude, pickup_longitude, drop_latitude, drop_longitude):
        distance_km = haversine_distance_km(
            pickup_latitude,
            pickup_longitude,
            drop_latitude,
            drop_longitude,
        )
        return round(base_fare + max(distance_km, 1) * per_km_rate, 2)

    return round(base_fare, 2)


async def get_driver_by_identifier(
    db: AsyncSession,
    identifier: str,
) -> MobilityDriver | None:
    result = await db.execute(
        select(MobilityDriver)
        .options(selectinload(MobilityDriver.vehicle))
        .where(or_(MobilityDriver.email == identifier, MobilityDriver.phone == identifier))
    )
    return result.scalar_one_or_none()


async def get_available_drivers(db: AsyncSession) -> list[MobilityDriver]:
    result = await db.execute(
        select(MobilityDriver)
        .join(MobilityVehicle, MobilityVehicle.driver_id == MobilityDriver.id)
        .options(selectinload(MobilityDriver.vehicle))
        .where(
            MobilityDriver.is_active.is_(True),
            MobilityDriver.status == "active",
        )
        .order_by(MobilityDriver.last_seen_at.desc())
    )
    return result.scalars().all()


async def get_available_driver_by_id(
    db: AsyncSession,
    driver_id: str | None,
) -> MobilityDriver | None:
    if not driver_id:
        return None

    result = await db.execute(
        select(MobilityDriver)
        .join(MobilityVehicle, MobilityVehicle.driver_id == MobilityDriver.id)
        .options(selectinload(MobilityDriver.vehicle))
        .where(
            MobilityDriver.id == parse_uuid(driver_id, "driver id"),
            MobilityDriver.is_active.is_(True),
            MobilityDriver.status == "active",
        )
    )
    return result.scalar_one_or_none()


def distance_between_driver_and_ride(
    driver: MobilityDriver,
    ride_lead: MobilityRideLead,
) -> float | None:
    if (
        driver.current_latitude is None
        or driver.current_longitude is None
        or ride_lead.pickup_latitude is None
        or ride_lead.pickup_longitude is None
    ):
        return None

    return haversine_distance_km(
        driver.current_latitude,
        driver.current_longitude,
        ride_lead.pickup_latitude,
        ride_lead.pickup_longitude,
    )


def driver_can_receive_ride(driver: MobilityDriver, ride_lead: MobilityRideLead) -> bool:
    if ride_lead.assigned_driver_id == driver.id:
        return True

    if ride_lead.status != "pending":
        return False

    if ride_lead.requested_driver_id and ride_lead.requested_driver_id != driver.id:
        return False

    if not driver.vehicle or not driver.is_active or driver.status != "active":
        return False

    distance_km = distance_between_driver_and_ride(driver, ride_lead)
    if distance_km is None:
        return False

    return distance_km <= float(ride_lead.tier_radius_km or RIDE_TIERS["tier_1"]["radius_km"])


async def sync_customer_booking_for_accepted_ride(
    db: AsyncSession,
    ride_lead: MobilityRideLead,
    driver: MobilityDriver,
):
    vehicle = driver.vehicle
    metadata_patch = {
        "ride_request_id": str(ride_lead.id),
        "ride_status": ride_lead.status,
        "ride_accepted_at": ride_lead.accepted_at.isoformat() if ride_lead.accepted_at else None,
        "driver_id": str(driver.id),
        "driver_name": driver.full_name,
        "driver_phone": driver.phone,
        "driver_rating": driver.rating,
        "vehicle_name": vehicle.vehicle_name if vehicle else None,
        "vehicle_type": vehicle.vehicle_type if vehicle else None,
        "vehicle_brand": vehicle.brand if vehicle else None,
        "vehicle_model": vehicle.model if vehicle else None,
        "vehicle_color": vehicle.color if vehicle else None,
        "vehicle_photo_url": vehicle.photo_url if vehicle else None,
        "plate_number": vehicle.plate_number if vehicle else None,
        "tier_key": ride_lead.tier_key,
        "tier_label": ride_lead.tier_label,
        "tier_radius_km": ride_lead.tier_radius_km,
        "tier_fare": ride_lead.tier_fare,
        "trip_distance_km": ride_lead.trip_distance_km,
        "estimated_fare": ride_lead.estimated_fare,
    }

    await db.execute(
        text(
            """
            UPDATE booking_requests
            SET
              status = 'accepted',
              total_amount = COALESCE(total_amount, :estimated_fare),
              metadata = COALESCE(metadata, '{}'::jsonb) || CAST(:metadata_patch AS jsonb),
              updated_at = NOW()
            WHERE service_type = 'cab'
              AND metadata->>'ride_request_id' = :ride_request_id
            """
        ),
        {
            "estimated_fare": ride_lead.estimated_fare,
            "metadata_patch": json.dumps(metadata_patch),
            "ride_request_id": str(ride_lead.id),
        },
    )


async def get_paid_cab_booking_id(
    db: AsyncSession,
    payload: RideRequestCreateSchema,
) -> uuid.UUID:
    if not payload.booking_request_id:
        raise HTTPException(status_code=402, detail="Complete payment before requesting a driver.")

    booking_request_id = parse_uuid(payload.booking_request_id, "booking request id")
    customer_user_id = (
        parse_uuid(payload.customer_user_id, "customer user id")
        if payload.customer_user_id
        else None
    )
    customer_filter = "AND user_id = :customer_user_id" if customer_user_id else ""
    result = await db.execute(
        text(
            """
            SELECT id
            FROM booking_requests
            WHERE id = :booking_request_id
              AND service_type = 'cab'
              AND status = 'paid'
            """
            + customer_filter
        ),
        {
            "booking_request_id": booking_request_id,
            "customer_user_id": customer_user_id,
        },
    )
    if not result.mappings().first():
        raise HTTPException(status_code=402, detail="Paid cab booking was not found.")

    return booking_request_id


async def find_driver_for_request(
    db: AsyncSession,
    selected_driver_id: str | None,
    pickup_latitude: float | None,
    pickup_longitude: float | None,
) -> MobilityDriver | None:
    if selected_driver_id:
        result = await db.execute(
            select(MobilityDriver)
            .options(selectinload(MobilityDriver.vehicle))
            .where(
                MobilityDriver.id == selected_driver_id,
                MobilityDriver.is_active.is_(True),
                MobilityDriver.status == "active",
            )
        )
        return result.scalar_one_or_none()

    available_drivers = await get_available_drivers(db)
    if not available_drivers:
        return None

    if pickup_latitude is None or pickup_longitude is None:
        return available_drivers[0]

    ranked = []
    for driver in available_drivers:
        if driver.current_latitude is None or driver.current_longitude is None:
            continue
        ranked.append(
            (
                haversine_distance_km(
                    pickup_latitude,
                    pickup_longitude,
                    driver.current_latitude,
                    driver.current_longitude,
                ),
                driver,
            )
        )

    if ranked:
        ranked.sort(key=lambda item: item[0])
        return ranked[0][1]

    return available_drivers[0]


@app.get("/mobility")
async def health_check():
    return {"status": "ok", "service": settings.PROJECT_NAME}


@app.post("/mobility/auth/register", status_code=status.HTTP_201_CREATED)
async def register_driver(
    payload: DriverRegisterSchema,
    db: AsyncSession = Depends(get_db),
):
    existing_driver = await get_driver_by_identifier(db, payload.email)
    if existing_driver:
        raise HTTPException(status_code=409, detail="A driver with this email already exists.")

    result = await db.execute(select(MobilityDriver).where(MobilityDriver.phone == payload.phone))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="A driver with this phone already exists.")

    result = await db.execute(
        select(MobilityVehicle).where(MobilityVehicle.plate_number == payload.vehicle.plate_number)
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This plate number is already registered.")

    driver = MobilityDriver(
        full_name=payload.full_name,
        email=payload.email,
        phone=payload.phone,
        hashed_password=hash_password(payload.password),
        aadhaar_number=payload.aadhaar_number,
        aadhaar_image_url=payload.aadhaar_image_url,
        license_number=payload.license_number,
        license_image_url=payload.license_image_url,
        profile_photo_url=payload.profile_photo_url,
        emergency_contact_name=payload.emergency_contact_name,
        emergency_contact_phone=payload.emergency_contact_phone,
        current_area_label=payload.current_area_label,
        current_latitude=payload.current_latitude,
        current_longitude=payload.current_longitude,
        is_online=False,
        is_active=True,
        status="active",
        last_seen_at=datetime.utcnow(),
    )
    vehicle_payload = payload.vehicle.model_dump()
    vehicle_payload["photo_urls"] = merge_primary_image_url(
        vehicle_payload.get("photo_url"),
        vehicle_payload.get("photo_urls"),
    )
    vehicle_payload["rc_image_urls"] = merge_primary_image_url(
        vehicle_payload.get("rc_image_url"),
        vehicle_payload.get("rc_image_urls"),
    )
    vehicle_payload["insurance_image_urls"] = merge_primary_image_url(
        vehicle_payload.get("insurance_image_url"),
        vehicle_payload.get("insurance_image_urls"),
    )
    vehicle_payload["photo_url"] = vehicle_payload["photo_urls"][0] if vehicle_payload["photo_urls"] else None
    vehicle_payload["rc_image_url"] = vehicle_payload["rc_image_urls"][0] if vehicle_payload["rc_image_urls"] else None
    vehicle_payload["insurance_image_url"] = (
        vehicle_payload["insurance_image_urls"][0]
        if vehicle_payload["insurance_image_urls"]
        else None
    )
    driver.vehicle = MobilityVehicle(**vehicle_payload)
    db.add(driver)
    await db.commit()
    await db.refresh(driver)

    result = await db.execute(
        select(MobilityDriver)
        .options(selectinload(MobilityDriver.vehicle))
        .where(MobilityDriver.id == driver.id)
    )
    driver = result.scalar_one()
    access_token = create_access_token(str(driver.id), extra={"role": "driver"})

    return {
        "access": access_token,
        "driver": serialize_driver(driver),
    }


@app.post("/mobility/auth/login")
async def login_driver(
    payload: DriverLoginSchema,
    db: AsyncSession = Depends(get_db),
):
    driver = await get_driver_by_identifier(db, payload.identifier)
    if not driver or not verify_password(payload.password, driver.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    if not driver.is_active or driver.status != "active":
        raise HTTPException(status_code=403, detail="Driver account is inactive.")

    driver.last_seen_at = datetime.utcnow()
    await db.commit()
    access_token = create_access_token(str(driver.id), extra={"role": "driver"})
    return {
        "access": access_token,
        "driver": serialize_driver(driver),
    }


@app.post("/mobility/auth/logout")
async def logout_driver(_: MobilityDriver = Depends(get_current_driver)):
    return {"message": "Logout successful."}


@app.post("/mobility/auth/google", status_code=status.HTTP_200_OK)
async def google_auth(
    payload: GoogleTokenSchema,
    db: AsyncSession = Depends(get_db),
):
    """Verify a Google access_token via userinfo endpoint and sign in or auto-register."""
    import httpx

    # Fetch user info from Google using the access token
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {payload.credential}"},
                timeout=10.0,
            )
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid or expired Google token.")
        id_info = resp.json()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=401, detail=f"Google verification failed: {exc}")

    google_email: str = id_info.get("email", "").lower().strip()
    google_name: str = id_info.get("name", "")
    google_picture: str | None = id_info.get("picture")

    if not google_email:
        raise HTTPException(status_code=400, detail="Google account has no email.")

    # --- Find existing driver ---
    result = await db.execute(
        select(MobilityDriver)
        .options(selectinload(MobilityDriver.vehicle))
        .where(MobilityDriver.email == google_email)
    )
    driver = result.scalar_one_or_none()

    if driver:
        # Existing driver — just log in
        if not driver.is_active or driver.status != "active":
            raise HTTPException(status_code=403, detail="Driver account is inactive.")
        driver.last_seen_at = datetime.utcnow()
        # Update profile picture if they don't have one
        if not driver.profile_photo_url and google_picture:
            driver.profile_photo_url = google_picture
        await db.commit()
        await db.refresh(driver)
        result2 = await db.execute(
            select(MobilityDriver)
            .options(selectinload(MobilityDriver.vehicle))
            .where(MobilityDriver.id == driver.id)
        )
        driver = result2.scalar_one()
        access_token = create_access_token(str(driver.id), extra={"role": "driver"})
        return {
            "access": access_token,
            "driver": serialize_driver(driver),
            "is_new": False,
        }

    # --- New driver — auto-register a minimal account without vehicle ---
    import secrets as _secrets
    random_password = _secrets.token_urlsafe(24)
    driver = MobilityDriver(
        full_name=google_name or google_email.split("@")[0],
        email=google_email,
        phone=None,
        hashed_password=hash_password(random_password),
        profile_photo_url=google_picture,
        is_online=False,
        is_active=True,
        status="active",
        last_seen_at=datetime.utcnow(),
    )
    db.add(driver)
    await db.commit()
    await db.refresh(driver)
    access_token = create_access_token(str(driver.id), extra={"role": "driver"})
    return {
        "access": access_token,
        "driver": serialize_driver(driver),
        "is_new": True,   # frontend can redirect to complete profile
    }


@app.get("/mobility/auth/me")
async def get_driver_me(current_driver: MobilityDriver = Depends(get_current_driver)):
    return serialize_driver(current_driver)


@app.patch("/mobility/driver/profile")
async def update_driver_profile(
    payload: DriverProfileUpdateSchema,
    current_driver: MobilityDriver = Depends(get_current_driver),
    db: AsyncSession = Depends(get_db),
):
    incoming = payload.model_dump(exclude_unset=True)

    if payload.full_name is not None and not clean_text(payload.full_name):
        raise HTTPException(status_code=400, detail="Full name is required.")
    if payload.phone is not None and not clean_text(payload.phone):
        raise HTTPException(status_code=400, detail="Phone number is required.")

    is_setting_location_coordinates = (
        ("current_latitude" in incoming and incoming.get("current_latitude") is not None)
        or ("current_longitude" in incoming and incoming.get("current_longitude") is not None)
    )
    if is_setting_location_coordinates:
        issues = location_readiness_issues(
            current_driver,
            full_name=incoming.get("full_name"),
            phone=incoming.get("phone"),
        )
        if issues:
            raise HTTPException(status_code=400, detail=issues[0])

    if payload.phone and payload.phone != current_driver.phone:
        result = await db.execute(
            select(MobilityDriver).where(
                MobilityDriver.phone == payload.phone,
                MobilityDriver.id != current_driver.id,
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="This phone number is already in use.")

    for key, value in incoming.items():
        setattr(current_driver, key, value)

    current_driver.last_seen_at = datetime.utcnow()
    await db.commit()
    await db.refresh(current_driver)
    result = await db.execute(
        select(MobilityDriver)
        .options(selectinload(MobilityDriver.vehicle))
        .where(MobilityDriver.id == current_driver.id)
    )
    return serialize_driver(result.scalar_one())


@app.put("/mobility/driver/vehicle")
async def upsert_driver_vehicle(
    payload: VehicleUpsertSchema,
    current_driver: MobilityDriver = Depends(get_current_driver),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MobilityVehicle).where(
            MobilityVehicle.plate_number == payload.plate_number,
            MobilityVehicle.driver_id != current_driver.id,
        )
    )
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="This plate number is already registered.")

    vehicle_result = await db.execute(
        select(MobilityVehicle).where(MobilityVehicle.driver_id == current_driver.id)
    )
    vehicle = vehicle_result.scalar_one_or_none()

    vehicle_payload = payload.model_dump()
    vehicle_payload["photo_urls"] = merge_primary_image_url(
        vehicle_payload.get("photo_url"),
        vehicle_payload.get("photo_urls"),
    )
    vehicle_payload["rc_image_urls"] = merge_primary_image_url(
        vehicle_payload.get("rc_image_url"),
        vehicle_payload.get("rc_image_urls"),
    )
    vehicle_payload["insurance_image_urls"] = merge_primary_image_url(
        vehicle_payload.get("insurance_image_url"),
        vehicle_payload.get("insurance_image_urls"),
    )
    vehicle_payload["photo_url"] = vehicle_payload["photo_urls"][0] if vehicle_payload["photo_urls"] else None
    vehicle_payload["rc_image_url"] = vehicle_payload["rc_image_urls"][0] if vehicle_payload["rc_image_urls"] else None
    vehicle_payload["insurance_image_url"] = (
        vehicle_payload["insurance_image_urls"][0]
        if vehicle_payload["insurance_image_urls"]
        else None
    )

    if vehicle:
        for key, value in vehicle_payload.items():
            setattr(vehicle, key, value)
    else:
        vehicle = MobilityVehicle(driver_id=current_driver.id, **vehicle_payload)
        db.add(vehicle)

    current_driver.last_seen_at = datetime.utcnow()
    await db.commit()

    result = await db.execute(
        select(MobilityDriver)
        .options(selectinload(MobilityDriver.vehicle))
        .where(MobilityDriver.id == current_driver.id)
    )
    return serialize_driver(result.scalar_one())


@app.patch("/mobility/driver/status")
async def update_driver_status(
    payload: DriverStatusSchema,
    current_driver: MobilityDriver = Depends(get_current_driver),
    db: AsyncSession = Depends(get_db),
):
    if payload.current_latitude is not None or payload.current_longitude is not None:
        issues = location_readiness_issues(current_driver)
        if issues:
            raise HTTPException(status_code=400, detail=issues[0])

    if payload.is_online:
        issues = online_readiness_issues(current_driver)
        if issues:
            raise HTTPException(status_code=400, detail=issues[0])
        if payload.current_latitude is None or payload.current_longitude is None:
            raise HTTPException(
                status_code=400,
                detail="Refresh your location before going online.",
            )

    current_driver.is_online = payload.is_online
    current_driver.current_area_label = payload.current_area_label
    current_driver.current_latitude = payload.current_latitude
    current_driver.current_longitude = payload.current_longitude
    current_driver.last_seen_at = datetime.utcnow()
    await db.commit()
    await db.refresh(current_driver)
    result = await db.execute(
        select(MobilityDriver)
        .options(selectinload(MobilityDriver.vehicle))
        .where(MobilityDriver.id == current_driver.id)
    )
    return serialize_driver(result.scalar_one())


@app.get("/mobility/driver/dashboard")
async def get_driver_dashboard(
    current_driver: MobilityDriver = Depends(get_current_driver),
    db: AsyncSession = Depends(get_db),
):
    ride_result = await db.execute(
        select(MobilityRideLead)
        .options(selectinload(MobilityRideLead.driver).selectinload(MobilityDriver.vehicle))
        .where(
            MobilityRideLead.assigned_driver_id == current_driver.id,
            MobilityRideLead.status.in_(("accepted", "completed", "paid")),
            MobilityRideLead.payment_status == "paid",
        )
        .order_by(MobilityRideLead.created_at.desc())
        .limit(8)
    )
    ride_leads = ride_result.scalars().all()

    stats_result = await db.execute(
        select(
            func.count(MobilityRideLead.id),
            func.coalesce(func.sum(MobilityRideLead.estimated_fare), 0.0),
            func.coalesce(func.sum(MobilityRideLead.commission_amount), 0.0),
        ).where(
            MobilityRideLead.assigned_driver_id == current_driver.id,
            MobilityRideLead.status.in_(("accepted", "completed", "paid")),
            MobilityRideLead.payment_status == "paid",
        )
    )
    paid_count, total_fare, total_commission = stats_result.one()

    return {
        "driver": serialize_driver(current_driver),
        "stats": {
            "paid_customers": paid_count or 0,
            "total_fare": round(float(total_fare or 0), 2),
            "total_commission": round(float(total_commission or 0), 2),
            "commission_rate": COMMISSION_RATE,
            "online_status": current_driver.is_online,
        },
        "recent_paid_customers": [serialize_ride_lead(lead) for lead in ride_leads],
    }


@app.get("/mobility/driver/ride-requests")
async def get_driver_ride_requests(
    current_driver: MobilityDriver = Depends(get_current_driver),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
):
    result = await db.execute(
        select(MobilityRideLead)
        .options(selectinload(MobilityRideLead.driver).selectinload(MobilityDriver.vehicle))
        .where(
            MobilityRideLead.status.in_(RIDE_STATUSES_VISIBLE_TO_DRIVER),
            MobilityRideLead.payment_status == "paid",
        )
        .order_by(MobilityRideLead.created_at.desc())
        .limit(max(limit * 4, 40))
    )
    visible_leads = [
        lead for lead in result.scalars().all()
        if driver_can_receive_ride(current_driver, lead)
    ]
    visible_leads.sort(
        key=lambda lead: (
            0 if lead.status == "pending" else 1,
            distance_between_driver_and_ride(current_driver, lead) or 999999,
            lead.created_at,
        )
    )
    payload = []
    for lead in visible_leads[:limit]:
        item = serialize_ride_lead(lead)
        distance_km = distance_between_driver_and_ride(current_driver, lead)
        item["distance_km"] = round(distance_km, 2) if distance_km is not None else None
        payload.append(item)
    return payload


@app.post("/mobility/driver/ride-requests/{ride_request_id}/accept")
async def accept_ride_request(
    ride_request_id: str,
    current_driver: MobilityDriver = Depends(get_current_driver),
    db: AsyncSession = Depends(get_db),
):
    if not current_driver.vehicle:
        raise HTTPException(status_code=400, detail="Add vehicle details before accepting rides.")

    result = await db.execute(
        select(MobilityRideLead)
        .options(selectinload(MobilityRideLead.driver).selectinload(MobilityDriver.vehicle))
        .where(MobilityRideLead.id == parse_uuid(ride_request_id, "ride request id"))
        .with_for_update()
    )
    ride_lead = result.scalar_one_or_none()
    if not ride_lead:
        raise HTTPException(status_code=404, detail="Ride request not found.")
    if ride_lead.payment_status != "paid":
        raise HTTPException(status_code=402, detail="This cab request is not paid yet.")

    if ride_lead.status == "accepted":
        if ride_lead.assigned_driver_id == current_driver.id:
            return {
                "ride_request": serialize_ride_lead(ride_lead),
                "assigned_driver": serialize_driver(current_driver, include_private=False),
            }
        raise HTTPException(status_code=409, detail="Another driver already accepted this ride.")

    if ride_lead.status not in ("pending", "requested"):
        raise HTTPException(status_code=409, detail="This ride is no longer available.")

    if ride_lead.requested_driver_id and ride_lead.requested_driver_id != current_driver.id:
        raise HTTPException(status_code=403, detail="This ride was requested from another driver.")

    if not driver_can_receive_ride(current_driver, ride_lead):
        raise HTTPException(status_code=400, detail="This request is outside your selected service range.")

    now = datetime.utcnow()
    ride_lead.assigned_driver_id = current_driver.id
    ride_lead.status = "accepted"
    ride_lead.payment_status = "paid"
    ride_lead.accepted_at = now
    ride_lead.updated_at = now
    current_driver.last_seen_at = now
    await db.flush()
    ride_lead.driver = current_driver
    await sync_customer_booking_for_accepted_ride(db, ride_lead, current_driver)
    await db.commit()

    result = await db.execute(
        select(MobilityRideLead)
        .options(selectinload(MobilityRideLead.driver).selectinload(MobilityDriver.vehicle))
        .where(MobilityRideLead.id == ride_lead.id)
    )
    accepted_ride = result.scalar_one()

    return {
        "ride_request": serialize_ride_lead(accepted_ride),
        "assigned_driver": serialize_driver(current_driver, include_private=False),
    }


@app.get("/mobility/public/drivers/nearby")
async def get_nearby_drivers(
    db: AsyncSession = Depends(get_db),
    latitude: float | None = Query(default=None),
    longitude: float | None = Query(default=None),
    radius_km: float = Query(default=30.0, ge=1, le=200),
    limit: int = Query(default=8, ge=1, le=50),
    passengers: int = Query(default=1, ge=1, le=8),
    tier_key: str | None = Query(default=None),
):
    available_drivers = await get_available_drivers(db)
    tier = None
    if tier_key:
        tier = resolve_ride_tier(RideRequestCreateSchema(
            pickup_label="pickup",
            drop_label="drop",
            passengers=passengers,
            tier_key=tier_key,
        ))

    ranked_results = []
    for driver in available_drivers:
        if not vehicle_matches_tier_and_passengers(driver.vehicle, passengers, tier):
            continue

        distance_km = None
        if latitude is not None and longitude is not None:
            if driver.current_latitude is None or driver.current_longitude is None:
                continue
            distance_km = haversine_distance_km(
                latitude,
                longitude,
                driver.current_latitude,
                driver.current_longitude,
            )
            if distance_km > radius_km:
                continue

        ranked_results.append(
            {
                "driver": serialize_driver(driver, include_private=False),
                "contact_phone": driver.phone,
                "distance_km": round(distance_km, 2) if distance_km is not None else None,
            }
        )

    ranked_results.sort(
        key=lambda item: (
            item["distance_km"] is None,
            item["distance_km"] if item["distance_km"] is not None else 999999,
            item["driver"]["full_name"],
        )
    )
    return ranked_results[:limit]


@app.post("/mobility/public/ride-requests", status_code=status.HTTP_201_CREATED)
async def create_ride_request(
    payload: RideRequestCreateSchema,
    db: AsyncSession = Depends(get_db),
):
    booking_request_id = await get_paid_cab_booking_id(db, payload)
    tier = resolve_ride_tier(payload)
    if not (tier["min_passengers"] <= payload.passengers <= tier["max_passengers"]):
        raise HTTPException(
            status_code=400,
            detail=f"{tier['label']} supports {tier['min_passengers']} to {tier['max_passengers']} passengers.",
        )

    requested_driver = await get_available_driver_by_id(db, payload.selected_driver_id)
    if payload.selected_driver_id and not requested_driver:
        raise HTTPException(status_code=404, detail="Selected driver is no longer available.")
    if requested_driver and not vehicle_matches_tier_and_passengers(
        requested_driver.vehicle,
        payload.passengers,
        tier,
    ):
        raise HTTPException(status_code=400, detail="Selected driver does not match this tier and passenger count.")

    trip_distance_km = resolve_trip_distance_km(payload)
    billable_distance_km = max(trip_distance_km or 1.0, 1.0)
    computed_fare = round(billable_distance_km * tier["fare"], 2)
    estimated_fare = (
        round(float(payload.estimated_fare), 2)
        if payload.estimated_fare is not None and payload.estimated_fare > 0
        else computed_fare
    )
    commission_amount = round(estimated_fare * COMMISSION_RATE, 2)

    ride_lead = MobilityRideLead(
        requested_driver_id=requested_driver.id if requested_driver else None,
        assigned_driver_id=None,
        customer_user_id=payload.customer_user_id,
        customer_name=payload.customer_name,
        customer_email=str(payload.customer_email) if payload.customer_email else None,
        customer_phone=payload.customer_phone,
        pickup_label=payload.pickup_label,
        drop_label=payload.drop_label,
        pickup_latitude=payload.pickup_latitude,
        pickup_longitude=payload.pickup_longitude,
        drop_latitude=payload.drop_latitude,
        drop_longitude=payload.drop_longitude,
        passengers=payload.passengers,
        tier_key=tier["key"],
        tier_label=tier["label"],
        tier_radius_km=tier["radius_km"],
        tier_fare=tier["fare"],
        trip_distance_km=trip_distance_km,
        estimated_fare=estimated_fare,
        commission_amount=commission_amount,
        payment_status="paid",
        status="pending",
        source=payload.source,
        notes=payload.notes,
    )
    db.add(ride_lead)
    await db.flush()

    metadata_patch = {
        "ride_request_id": str(ride_lead.id),
        "ride_status": ride_lead.status,
        "requested_driver_id": str(requested_driver.id) if requested_driver else None,
        "requested_driver_name": requested_driver.full_name if requested_driver else None,
        "requested_driver_phone": requested_driver.phone if requested_driver else None,
        "tier_key": ride_lead.tier_key,
        "tier_label": ride_lead.tier_label,
        "tier_per_km_rate": ride_lead.tier_fare,
        "tier_fare": ride_lead.tier_fare,
        "trip_distance_km": ride_lead.trip_distance_km,
        "estimated_fare": ride_lead.estimated_fare,
    }
    customer_user_id = (
        parse_uuid(payload.customer_user_id, "customer user id")
        if payload.customer_user_id
        else None
    )
    customer_filter = "AND user_id = :customer_user_id" if customer_user_id else ""
    await db.execute(
        text(
            """
            UPDATE booking_requests
            SET
              total_amount = :estimated_fare,
              metadata = COALESCE(metadata, '{}'::jsonb) || CAST(:metadata_patch AS jsonb),
              updated_at = NOW()
            WHERE id = :booking_request_id
              AND service_type = 'cab'
            """
            + customer_filter
        ),
        {
            "estimated_fare": ride_lead.estimated_fare,
            "metadata_patch": json.dumps(metadata_patch),
            "booking_request_id": booking_request_id,
            "customer_user_id": customer_user_id,
        },
    )

    await db.commit()
    await db.refresh(ride_lead)

    return {
        "ride_request": serialize_ride_lead(ride_lead),
        "requested_driver": serialize_driver(requested_driver, include_private=False)
        if requested_driver
        else None,
        "assigned_driver": None,
    }


@app.get("/mobility/public/ride-requests/{ride_request_id}")
async def get_public_ride_request(
    ride_request_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(MobilityRideLead)
        .options(selectinload(MobilityRideLead.driver).selectinload(MobilityDriver.vehicle))
        .where(MobilityRideLead.id == parse_uuid(ride_request_id, "ride request id"))
    )
    ride_lead = result.scalar_one_or_none()
    if not ride_lead:
        raise HTTPException(status_code=404, detail="Ride request not found.")

    assigned_driver = ride_lead.driver if ride_lead.status == "accepted" else None
    return {
        "ride_request": serialize_ride_lead(ride_lead),
        "assigned_driver": serialize_driver(assigned_driver, include_private=False)
        if assigned_driver
        else None,
    }


@app.post("/mobility/images/upload")
async def upload_image(file: UploadFile = File(...)):
    if not is_allowed_image_upload(file):
        raise HTTPException(status_code=400, detail="Unsupported image type.")

    content = await file.read()
    if len(content) > MAX_IMAGE_SIZE:
        raise HTTPException(status_code=413, detail="File too large.")

    filename = f"{uuid.uuid4().hex}-{sanitize_filename(Path(file.filename or 'image').name)}"

    if (
        settings.CLOUDINARY_CLOUD_NAME
        and settings.CLOUDINARY_API_KEY
        and settings.CLOUDINARY_API_SECRET
    ):
        try:
            upload_result = cloudinary.uploader.upload(
                content,
                folder="zahi_connect/mobility",
                public_id=Path(filename).stem,
                overwrite=False,
                resource_type="image",
            )
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Cloudinary image upload failed: {exc}") from exc

        secure_url = upload_result.get("secure_url")
        if not secure_url:
            raise HTTPException(status_code=500, detail="Image upload failed.")
        return {
            "status": "success",
            "provider": "cloudinary",
            "filename": file.filename or "image",
            "size": len(content),
            "url": secure_url,
        }

    file_path = UPLOAD_DIR / filename
    file_path.write_bytes(content)
    return {
        "status": "success",
        "provider": "local",
        "filename": file.filename or "image",
        "size": len(content),
        "url": build_public_asset_url(filename),
    }
