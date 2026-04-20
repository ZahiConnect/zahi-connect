import asyncio
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
from sqlalchemy import func, or_, select
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
    RideRequestCreateSchema,
    VehicleUpsertSchema,
)

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
COMMISSION_RATE = 0.12


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
        "http://localhost:4173",
        "http://localhost:4174",
        "http://localhost:4175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:4173",
        "http://127.0.0.1:4174",
        "http://127.0.0.1:4175",
        "http://localhost:3000",
        "http://localhost:8080",
    ],
    allow_origin_regex=(
        r"^https?://"
        r"(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|"
        r"172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})"
        r"(?::(?:3000|4173|4174|4175|5173|5174|5175|8080))?$"
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


def serialize_vehicle(vehicle: MobilityVehicle | None) -> dict | None:
    if not vehicle:
        return None
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
        "photo_url": vehicle.photo_url,
        "rc_image_url": vehicle.rc_image_url,
        "insurance_image_url": vehicle.insurance_image_url,
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
    return {
        "id": str(ride_lead.id),
        "assigned_driver_id": str(ride_lead.assigned_driver_id) if ride_lead.assigned_driver_id else None,
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
        "estimated_fare": ride_lead.estimated_fare,
        "commission_amount": ride_lead.commission_amount,
        "payment_status": ride_lead.payment_status,
        "status": ride_lead.status,
        "source": ride_lead.source,
        "notes": ride_lead.notes,
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


async def get_online_drivers(db: AsyncSession) -> list[MobilityDriver]:
    result = await db.execute(
        select(MobilityDriver)
        .options(selectinload(MobilityDriver.vehicle))
        .where(
            MobilityDriver.is_online.is_(True),
            MobilityDriver.is_active.is_(True),
            MobilityDriver.status == "active",
        )
        .order_by(MobilityDriver.last_seen_at.desc())
    )
    return result.scalars().all()


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
                MobilityDriver.is_online.is_(True),
                MobilityDriver.is_active.is_(True),
                MobilityDriver.status == "active",
            )
        )
        return result.scalar_one_or_none()

    online_drivers = await get_online_drivers(db)
    if not online_drivers:
        return None

    if pickup_latitude is None or pickup_longitude is None:
        return online_drivers[0]

    ranked = []
    for driver in online_drivers:
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

    return online_drivers[0]


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
    driver.vehicle = MobilityVehicle(**payload.vehicle.model_dump())
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


@app.get("/mobility/auth/me")
async def get_driver_me(current_driver: MobilityDriver = Depends(get_current_driver)):
    return serialize_driver(current_driver)


@app.patch("/mobility/driver/profile")
async def update_driver_profile(
    payload: DriverProfileUpdateSchema,
    current_driver: MobilityDriver = Depends(get_current_driver),
    db: AsyncSession = Depends(get_db),
):
    if payload.phone and payload.phone != current_driver.phone:
        result = await db.execute(
            select(MobilityDriver).where(
                MobilityDriver.phone == payload.phone,
                MobilityDriver.id != current_driver.id,
            )
        )
        if result.scalar_one_or_none():
            raise HTTPException(status_code=409, detail="This phone number is already in use.")

    for key, value in payload.model_dump(exclude_unset=True).items():
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

    if vehicle:
        for key, value in payload.model_dump().items():
            setattr(vehicle, key, value)
    else:
        vehicle = MobilityVehicle(driver_id=current_driver.id, **payload.model_dump())
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
        .where(
            MobilityRideLead.assigned_driver_id == current_driver.id,
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
        .where(MobilityRideLead.assigned_driver_id == current_driver.id)
        .order_by(MobilityRideLead.created_at.desc())
        .limit(limit)
    )
    return [serialize_ride_lead(lead) for lead in result.scalars().all()]


@app.get("/mobility/public/drivers/nearby")
async def get_nearby_drivers(
    db: AsyncSession = Depends(get_db),
    latitude: float | None = Query(default=None),
    longitude: float | None = Query(default=None),
    radius_km: float = Query(default=25.0, ge=1, le=200),
    limit: int = Query(default=8, ge=1, le=50),
):
    online_drivers = await get_online_drivers(db)

    ranked_results = []
    for driver in online_drivers:
        distance_km = None
        if (
            latitude is not None
            and longitude is not None
            and driver.current_latitude is not None
            and driver.current_longitude is not None
        ):
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
    assigned_driver = await find_driver_for_request(
        db,
        payload.selected_driver_id,
        payload.pickup_latitude,
        payload.pickup_longitude,
    )
    estimated_fare = compute_estimated_fare(
        assigned_driver.vehicle if assigned_driver else None,
        payload.pickup_latitude,
        payload.pickup_longitude,
        payload.drop_latitude,
        payload.drop_longitude,
    )
    commission_amount = round(estimated_fare * COMMISSION_RATE, 2)

    ride_lead = MobilityRideLead(
        assigned_driver_id=assigned_driver.id if assigned_driver else None,
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
        estimated_fare=estimated_fare,
        commission_amount=commission_amount,
        payment_status="paid",
        status="paid",
        source=payload.source,
        notes=payload.notes,
    )
    db.add(ride_lead)
    await db.commit()
    await db.refresh(ride_lead)

    return {
        "ride_request": serialize_ride_lead(ride_lead),
        "assigned_driver": serialize_driver(assigned_driver, include_private=False)
        if assigned_driver
        else None,
    }


@app.post("/mobility/images/upload")
async def upload_image(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
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
        upload_result = cloudinary.uploader.upload(
            content,
            folder="zahi_connect/mobility",
            public_id=Path(filename).stem,
            overwrite=False,
            resource_type="image",
        )
        secure_url = upload_result.get("secure_url")
        if not secure_url:
            raise HTTPException(status_code=500, detail="Image upload failed.")
        return {
            "status": "success",
            "filename": file.filename or "image",
            "size": len(content),
            "url": secure_url,
        }

    file_path = UPLOAD_DIR / filename
    file_path.write_bytes(content)
    return {
        "status": "success",
        "filename": file.filename or "image",
        "size": len(content),
        "url": build_public_asset_url(filename),
    }
