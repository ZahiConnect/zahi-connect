"""
Zahi Connect - Accounts Service Entry Point
Mirrors MyCalo AI_Services/main.py structure exactly.
"""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import Base, engine
from sqlalchemy import select, text

from database import AsyncSessionLocal
from models.user import User, WorkspaceMembership
from routers import (
    auth_router,
    marketplace_router,
    subscriptions_router,
    tenants_router,
    users_router,
    workspaces_router,
)

STARTUP_DB_RETRIES = 15
STARTUP_DB_RETRY_DELAY_SECONDS = 2


async def initialize_database():
    """Retry DB initialization so Docker startup timing does not kill the worker."""
    last_error = None

    for attempt in range(1, STARTUP_DB_RETRIES + 1):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                await conn.execute(text("ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_email_key"))
                await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT"))
            async with AsyncSessionLocal() as session:
                users = (
                    await session.execute(select(User).where(User.tenant_id.is_not(None)))
                ).scalars().all()
                for user in users:
                    membership = await session.execute(
                        select(WorkspaceMembership).where(
                            WorkspaceMembership.user_id == user.id,
                            WorkspaceMembership.tenant_id == user.tenant_id,
                        )
                    )
                    if not membership.scalar_one_or_none():
                        session.add(
                            WorkspaceMembership(
                                user_id=user.id,
                                tenant_id=user.tenant_id,
                                role=user.role if user.role != "customer" else "business_admin",
                            )
                        )
                await session.commit()
            return
        except Exception as exc:
            last_error = exc
            print(
                "[startup] accounts database not ready "
                f"(attempt {attempt}/{STARTUP_DB_RETRIES}): {exc}"
            )
            if attempt == STARTUP_DB_RETRIES:
                raise
            await asyncio.sleep(STARTUP_DB_RETRY_DELAY_SECONDS)

    raise last_error


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create database tables on startup."""
    await initialize_database()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url="/auth/docs",
    openapi_url="/auth/openapi.json",
    redoc_url="/auth/redoc",
    lifespan=lifespan,
)

# CORS Middleware (same structure as MyCalo)
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

# Include Routers (same pattern as MyCalo)
app.include_router(auth_router, prefix="/auth")
app.include_router(marketplace_router, prefix="/auth")
app.include_router(subscriptions_router, prefix="/auth/subscriptions")
app.include_router(workspaces_router, prefix="/auth/workspaces")
app.include_router(users_router, prefix="/auth/users")
app.include_router(tenants_router, prefix="/auth/tenants")


# Health check (same as MyCalo's @app.get("/ai"))
@app.get("/auth")
def health_check():
    return {"status": "ok", "service": "Zahi Connect - Accounts Service"}
