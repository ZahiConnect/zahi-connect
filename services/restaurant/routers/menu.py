"""
Zahi Connect - Menu Router
CRUD for menu categories and menu items.
"""

import uuid

from fastapi import APIRouter, Depends, status, UploadFile, File
from fastapi.exceptions import HTTPException
import cloudinary.uploader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from database import get_db
from dependencies import get_current_admin, get_current_user, get_tenant_id
from models.menu import MenuCategory, MenuItem
from schemas.menu import (
    MenuCategoryCreate,
    MenuCategoryResponse,
    MenuItemCreate,
    MenuItemResponse,
    MenuItemUpdate,
)

router = APIRouter(tags=["Menu"])


# ═══════════════════════════════════════════════════════════════
#  CATEGORIES
# ═══════════════════════════════════════════════════════════════

@router.post("/categories", response_model=MenuCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: MenuCategoryCreate,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    category = MenuCategory(tenant_id=tenant_id, **data.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.get("/categories", response_model=list[MenuCategoryResponse])
async def list_categories(
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(MenuCategory)
        .where(MenuCategory.tenant_id == tenant_id)
        .order_by(MenuCategory.sort_order)
    )
    return result.scalars().all()


@router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_category(
    category_id: uuid.UUID,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    result = await db.execute(
        select(MenuCategory).where(
            MenuCategory.id == category_id, MenuCategory.tenant_id == tenant_id
        )
    )
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    await db.delete(category)
    await db.commit()


# ═══════════════════════════════════════════════════════════════
#  MENU ITEMS
# ═══════════════════════════════════════════════════════════════

@router.post("/items", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
async def create_item(
    data: MenuItemCreate,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    item = MenuItem(tenant_id=tenant_id, **data.model_dump())
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/items", response_model=list[MenuItemResponse])
async def list_items(
    category_id: uuid.UUID | None = None,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    query = select(MenuItem).where(MenuItem.tenant_id == tenant_id)
    if category_id:
        query = query.where(MenuItem.category_id == category_id)
    result = await db.execute(query.order_by(MenuItem.name))
    return result.scalars().all()


@router.get("/items/{item_id}", response_model=MenuItemResponse)
async def get_item(
    item_id: uuid.UUID,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    result = await db.execute(
        select(MenuItem).where(MenuItem.id == item_id, MenuItem.tenant_id == tenant_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return item


@router.patch("/items/{item_id}", response_model=MenuItemResponse)
async def update_item(
    item_id: uuid.UUID,
    data: MenuItemUpdate,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    result = await db.execute(
        select(MenuItem).where(MenuItem.id == item_id, MenuItem.tenant_id == tenant_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/items/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: uuid.UUID,
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    result = await db.execute(
        select(MenuItem).where(MenuItem.id == item_id, MenuItem.tenant_id == tenant_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")
    await db.delete(item)
    await db.commit()


@router.post("/items/{item_id}/image", response_model=MenuItemResponse)
async def upload_item_image(
    item_id: uuid.UUID,
    file: UploadFile = File(...),
    tenant_id: str = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    result = await db.execute(
        select(MenuItem).where(MenuItem.id == item_id, MenuItem.tenant_id == tenant_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Menu item not found")

    try:
        contents = await file.read()
        upload_result = cloudinary.uploader.upload(
            contents, 
            folder=f"zahi_connect/menu/{tenant_id}"
        )
        
        item.image_url = upload_result.get("secure_url")
        await db.commit()
        await db.refresh(item)
        return item
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {str(e)}")
