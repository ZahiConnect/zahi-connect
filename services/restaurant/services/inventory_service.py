"""
Zahi Connect - Inventory Service
Stock deduction and low-stock alert logic.
"""

from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.inventory import InventoryItem


class InventoryService:

    @staticmethod
    async def check_low_stock(db: AsyncSession, tenant_id: str) -> list[InventoryItem]:
        """Return all items that are at or below their low_stock_threshold."""
        result = await db.execute(
            select(InventoryItem).where(
                InventoryItem.tenant_id == tenant_id,
                InventoryItem.quantity <= InventoryItem.low_stock_threshold,
            )
        )
        return result.scalars().all()

    @staticmethod
    async def deduct_stock(
        db: AsyncSession,
        tenant_id: str,
        item_name: str,
        amount: float,
    ) -> InventoryItem | None:
        """Deduct stock for a given ingredient. Returns None if not found."""
        result = await db.execute(
            select(InventoryItem).where(
                InventoryItem.tenant_id == tenant_id,
                InventoryItem.name == item_name,
            )
        )
        item = result.scalar_one_or_none()
        if not item:
            return None

        item.quantity = max(Decimal("0"), Decimal(str(item.quantity)) - Decimal(str(amount)))
        await db.commit()
        await db.refresh(item)
        return item
