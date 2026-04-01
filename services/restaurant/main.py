"""
Zahi Connect - Restaurant Service Entry Point
Same structure as accounts/main.py and MyCalo AI_Services/main.py.
"""

import asyncio
import cloudinary
import cloudinary.uploader
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from sqlalchemy import text

from config import settings
from database import Base, engine
from routers import (
    billing_router,
    menu_router,
    orders_router,
    tables_router,
    inventory_router,
    kitchen_router,
    reports_router,
    service_router,
)
from services.realtime import build_restaurant_event, restaurant_realtime

STARTUP_DB_RETRIES = 15
STARTUP_DB_RETRY_DELAY_SECONDS = 2
SCHEMA_PATCHES = [
    "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'General'",
    "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS supplier VARCHAR(200)",
    "ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(10, 2) DEFAULT 0",
    "UPDATE inventory_items SET category = 'General' WHERE category IS NULL",
    "UPDATE inventory_items SET unit_cost = 0 WHERE unit_cost IS NULL",
    "ALTER TABLE orders ALTER COLUMN status TYPE VARCHAR(30)",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_assignee VARCHAR(200)",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_started_at TIMESTAMP",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS served_at TIMESTAMP",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS bill_number VARCHAR(50)",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100)",
    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP",
    "ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_urls JSON DEFAULT '[]'",
    "UPDATE menu_items SET image_urls = CASE WHEN image_url IS NOT NULL THEN json_build_array(image_url) ELSE '[]'::json END WHERE image_urls IS NULL OR image_urls::text = 'null'",
]


async def initialize_database():
    """Retry DB initialization so Docker startup timing does not kill the worker."""
    last_error = None

    for attempt in range(1, STARTUP_DB_RETRIES + 1):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            return
        except Exception as exc:
            last_error = exc
            print(
                "[startup] restaurant database not ready "
                f"(attempt {attempt}/{STARTUP_DB_RETRIES}): {exc}"
            )
            if attempt == STARTUP_DB_RETRIES:
                raise
            await asyncio.sleep(STARTUP_DB_RETRY_DELAY_SECONDS)

    raise last_error


async def apply_schema_updates():
    """Apply lightweight schema patches when tables already exist without migrations."""
    async with engine.begin() as conn:
        for statement in SCHEMA_PATCHES:
            await conn.execute(text(statement))


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize things on startup."""
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
    )

    await initialize_database()
    await apply_schema_updates()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/rms/docs",
    openapi_url="/rms/openapi.json",
    redoc_url="/rms/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost:8080",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(menu_router, prefix="/rms/menu")
app.include_router(orders_router, prefix="/rms/orders")
app.include_router(tables_router, prefix="/rms/tables")
app.include_router(inventory_router, prefix="/rms/inventory")
app.include_router(kitchen_router, prefix="/rms/kitchen")
app.include_router(service_router, prefix="/rms/service")
app.include_router(billing_router, prefix="/rms/billing")
app.include_router(reports_router, prefix="/rms/reports")


@app.get("/rms")
def health_check():
    return {"status": "ok", "service": "Zahi Connect - Restaurant Service"}


def decode_socket_user(token: str | None) -> dict | None:
    if not token:
        return None

    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


@app.websocket("/rms/ws/updates")
async def restaurant_updates_socket(websocket: WebSocket):
    user_payload = decode_socket_user(websocket.query_params.get("token"))
    tenant_id = user_payload.get("tenant_id") if user_payload else None

    if not user_payload or not tenant_id:
        await websocket.close(code=4401)
        return

    tenant_key = str(tenant_id)
    await restaurant_realtime.connect(tenant_key, websocket)
    await websocket.send_json(
        build_restaurant_event(
            "restaurant.connected",
            ["orders", "kitchen", "tables", "service", "billing", "dashboard", "reports"],
        )
    )

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await restaurant_realtime.disconnect(tenant_key, websocket)
