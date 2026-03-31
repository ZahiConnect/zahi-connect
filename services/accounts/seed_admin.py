"""
Zahi Connect - Seed Script
Creates the initial Super Admin user.
Run: docker compose exec accounts python seed_admin.py
"""

import asyncio

from sqlalchemy import select

from database import AsyncSessionLocal, Base, engine
from models.user import User
from services.auth_service import AuthService

auth = AuthService()


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.role == "super_admin")
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"✅ Super Admin already exists: {existing.email}")
            return

        super_admin = User(
            username="zahi_admin",
            email="admin@zahiconnect.com",
            hashed_password=auth.hash_password("admin123"),
            first_name="Zahi",
            last_name="Admin",
            role="super_admin",
            status="active",
            is_active=True,
        )
        db.add(super_admin)
        await db.commit()

        print("═══════════════════════════════════════════")
        print("  🚀 Zahi Connect - Super Admin Created!")
        print("  Email:    admin@zahiconnect.com")
        print("  Password: admin123")
        print("  Role:     super_admin")
        print("═══════════════════════════════════════════")
        print("  ⚠️  Change the password after first login!")
        print("═══════════════════════════════════════════")


if __name__ == "__main__":
    asyncio.run(seed())
