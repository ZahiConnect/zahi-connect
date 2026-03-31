"""
Zahi Connect - Inventory Router
Stock management with low-stock alerts.
"""

import uuid

from fastapi import APIRouter, Depends, status
from fastapi.exceptions import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_admin, get_current_user, get_tenant_id
from models.inventory import InventoryItem
from schemas.inventory import InventoryItemCreate, InventoryItemResponse, InventoryItemUpdate
from services.inventory_service import InventoryService

router = APIRouter(tags=["Inventory"])

inventory_service = InventoryService()


@router.post("/", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    data: InventoryItemCreate,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    item = InventoryItem(tenant_id=tenant_id, **data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return InventoryItemResponse.from_model(item)


@router.get("/", response_model=list[InventoryItemResponse])
async def list_items(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(InventoryItem)
        .where(InventoryItem.tenant_id == tenant_id)
        .order_by(InventoryItem.name)
    )
    items = result.scalars().all()
    return [InventoryItemResponse.from_model(item) for item in items]


@router.get("/low-stock", response_model=list[InventoryItemResponse])
async def get_low_stock(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    """Get all items at or below their low-stock threshold."""
    items = await inventory_service.check_low_stock(db, tenant_id)
    return [InventoryItemResponse.from_model(item) for item in items]


@router.patch("/{item_id}", response_model=InventoryItemResponse)
async def update_item(
    item_id: uuid.UUID,
    data: InventoryItemUpdate,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.id == item_id, InventoryItem.tenant_id == tenant_id
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return InventoryItemResponse.from_model(item)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: uuid.UUID,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    result = await db.execute(
        select(InventoryItem).where(
            InventoryItem.id == item_id, InventoryItem.tenant_id == tenant_id
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    await db.delete(item)
    await db.commit()
