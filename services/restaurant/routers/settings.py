"""Restaurant workspace settings routes."""

import uuid
from typing import Any

import cloudinary.uploader
from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.exceptions import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from dependencies import get_current_admin, get_current_user, get_tenant_id
from models.settings import RestaurantProfile
from schemas.settings import (
    RestaurantCoverImageUpdate,
    RestaurantGeneralSettingsUpdate,
    RestaurantOperationsSettingsUpdate,
    RestaurantSettingsResponse,
)

router = APIRouter(tags=["Settings"])

ALLOWED_SERVICE_MODES = {"dine_in", "takeaway", "delivery"}
ALLOWED_PRICE_BANDS = {"budget", "mid_range", "premium"}


def clean_optional_text(value: Any) -> str | None:
    if value is None:
        return None
    text_value = str(value).strip()
    return text_value or None


def normalize_string_list(values: list[str] | None, *, lower: bool = False) -> list[str]:
    seen: set[str] = set()
    cleaned: list[str] = []

    for value in values or []:
        text_value = clean_optional_text(value)
        if not text_value:
            continue
        normalized = text_value.lower() if lower else text_value
        if normalized in seen:
            continue
        seen.add(normalized)
        cleaned.append(normalized)

    return cleaned


def serialize_profile(profile: RestaurantProfile | None, tenant_id: uuid.UUID) -> dict[str, Any]:
    if not profile:
        return {
            "id": None,
            "tenant_id": tenant_id,
            "tagline": None,
            "description": None,
            "area_name": None,
            "city": None,
            "state": None,
            "postal_code": None,
            "map_link": None,
            "contact_email": None,
            "reservation_phone": None,
            "whatsapp_number": None,
            "cuisine_tags": [],
            "service_modes": ["dine_in", "takeaway"],
            "opening_time": "09:00",
            "closing_time": "22:00",
            "average_prep_minutes": 20,
            "seating_capacity": None,
            "price_band": "mid_range",
            "accepts_reservations": True,
            "cover_image_url": None,
            "gallery_image_urls": [],
            "created_at": None,
            "updated_at": None,
        }

    return {
        "id": profile.id,
        "tenant_id": profile.tenant_id,
        "tagline": clean_optional_text(profile.tagline),
        "description": clean_optional_text(profile.description),
        "area_name": clean_optional_text(profile.area_name),
        "city": clean_optional_text(profile.city),
        "state": clean_optional_text(profile.state),
        "postal_code": clean_optional_text(profile.postal_code),
        "map_link": clean_optional_text(profile.map_link),
        "contact_email": clean_optional_text(profile.contact_email),
        "reservation_phone": clean_optional_text(profile.reservation_phone),
        "whatsapp_number": clean_optional_text(profile.whatsapp_number),
        "cuisine_tags": normalize_string_list(profile.cuisine_tags or []),
        "service_modes": normalize_string_list(profile.service_modes or [], lower=True) or ["dine_in"],
        "opening_time": clean_optional_text(profile.opening_time) or "09:00",
        "closing_time": clean_optional_text(profile.closing_time) or "22:00",
        "average_prep_minutes": profile.average_prep_minutes or 20,
        "seating_capacity": profile.seating_capacity,
        "price_band": clean_optional_text(profile.price_band) or "mid_range",
        "accepts_reservations": bool(profile.accepts_reservations),
        "cover_image_url": clean_optional_text(profile.cover_image_url),
        "gallery_image_urls": normalize_string_list(profile.gallery_image_urls or []),
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


async def load_tenant_or_404(db: AsyncSession, tenant_id: uuid.UUID) -> dict[str, Any]:
    tenant_result = await db.execute(
        text(
            """
            SELECT id, slug, business_type, name, email, phone, address
            FROM tenants
            WHERE id = :tenant_id AND business_type = 'restaurant'
            """
        ),
        {"tenant_id": tenant_id},
    )
    tenant = tenant_result.mappings().first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Restaurant workspace not found")
    return dict(tenant)


async def load_profile(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    *,
    create_if_missing: bool = False,
) -> RestaurantProfile | None:
    result = await db.execute(
        select(RestaurantProfile).where(RestaurantProfile.tenant_id == tenant_id)
    )
    profile = result.scalar_one_or_none()

    if profile or not create_if_missing:
        return profile

    profile = RestaurantProfile(
        tenant_id=tenant_id,
        service_modes=["dine_in", "takeaway"],
        cuisine_tags=[],
        opening_time="09:00",
        closing_time="22:00",
        average_prep_minutes=20,
        price_band="mid_range",
        accepts_reservations=True,
        gallery_image_urls=[],
    )
    db.add(profile)
    await db.flush()
    return profile


async def build_settings_payload(db: AsyncSession, tenant_id: uuid.UUID) -> dict[str, Any]:
    tenant = await load_tenant_or_404(db, tenant_id)
    profile = await load_profile(db, tenant_id)
    return {
        "tenant": tenant,
        "profile": serialize_profile(profile, tenant_id),
    }


def apply_general_profile_updates(
    profile: RestaurantProfile,
    data: RestaurantGeneralSettingsUpdate,
):
    profile.tagline = clean_optional_text(data.tagline)
    profile.description = clean_optional_text(data.description)
    profile.area_name = clean_optional_text(data.area_name)
    profile.city = clean_optional_text(data.city)
    profile.state = clean_optional_text(data.state)
    profile.postal_code = clean_optional_text(data.postal_code)
    profile.map_link = clean_optional_text(data.map_link)
    profile.contact_email = clean_optional_text(data.contact_email)
    profile.reservation_phone = clean_optional_text(data.reservation_phone)
    profile.whatsapp_number = clean_optional_text(data.whatsapp_number)


def apply_operations_updates(
    profile: RestaurantProfile,
    data: RestaurantOperationsSettingsUpdate,
):
    service_modes = [
        mode for mode in normalize_string_list(data.service_modes, lower=True) if mode in ALLOWED_SERVICE_MODES
    ]
    if not service_modes:
        service_modes = ["dine_in"]

    price_band = clean_optional_text(data.price_band) or "mid_range"
    if price_band not in ALLOWED_PRICE_BANDS:
        price_band = "mid_range"

    profile.service_modes = service_modes
    profile.cuisine_tags = normalize_string_list(data.cuisine_tags)
    profile.opening_time = clean_optional_text(data.opening_time) or "09:00"
    profile.closing_time = clean_optional_text(data.closing_time) or "22:00"
    profile.average_prep_minutes = data.average_prep_minutes or 20
    profile.seating_capacity = data.seating_capacity
    profile.price_band = price_band
    profile.accepts_reservations = bool(data.accepts_reservations)


def merge_gallery_urls(existing_urls: list[str] | None, new_urls: list[str]) -> list[str]:
    merged: list[str] = []

    for url in [*(existing_urls or []), *new_urls]:
        cleaned = clean_optional_text(url)
        if cleaned and cleaned not in merged:
            merged.append(cleaned)

    return merged


@router.get("", response_model=RestaurantSettingsResponse)
async def get_settings(
    tenant_id: uuid.UUID = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await build_settings_payload(db, tenant_id)


@router.patch("/general", response_model=RestaurantSettingsResponse)
async def update_general_settings(
    data: RestaurantGeneralSettingsUpdate,
    tenant_id: uuid.UUID = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    existing_tenant = await load_tenant_or_404(db, tenant_id)
    profile = await load_profile(db, tenant_id, create_if_missing=True)

    await db.execute(
        text(
            """
            UPDATE tenants
            SET
                name = :name,
                email = :email,
                phone = :phone,
                address = :address,
                updated_at = NOW()
            WHERE id = :tenant_id AND business_type = 'restaurant'
            """
        ),
        {
            "tenant_id": tenant_id,
            "name": clean_optional_text(data.name) or existing_tenant["name"],
            "email": clean_optional_text(data.email) or existing_tenant["email"],
            "phone": clean_optional_text(data.phone),
            "address": clean_optional_text(data.address),
        },
    )

    apply_general_profile_updates(profile, data)

    await db.commit()
    return await build_settings_payload(db, tenant_id)


@router.patch("/operations", response_model=RestaurantSettingsResponse)
async def update_operations_settings(
    data: RestaurantOperationsSettingsUpdate,
    tenant_id: uuid.UUID = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    await load_tenant_or_404(db, tenant_id)
    profile = await load_profile(db, tenant_id, create_if_missing=True)
    apply_operations_updates(profile, data)
    await db.commit()
    return await build_settings_payload(db, tenant_id)


@router.post("/images/cover", response_model=RestaurantSettingsResponse)
async def upload_cover_image(
    file: UploadFile = File(...),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    await load_tenant_or_404(db, tenant_id)
    profile = await load_profile(db, tenant_id, create_if_missing=True)

    try:
        contents = await file.read()
        upload_result = cloudinary.uploader.upload(
            contents,
            folder=f"zahi_connect/restaurants/{tenant_id}/profile",
        )
        secure_url = clean_optional_text(upload_result.get("secure_url"))
        if not secure_url:
            raise HTTPException(status_code=500, detail="Cover image upload failed")

        profile.cover_image_url = secure_url
        profile.gallery_image_urls = merge_gallery_urls(profile.gallery_image_urls, [secure_url])
        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {exc}") from exc

    return await build_settings_payload(db, tenant_id)


@router.post("/images/gallery", response_model=RestaurantSettingsResponse)
async def upload_gallery_images(
    files: list[UploadFile] = File(...),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    await load_tenant_or_404(db, tenant_id)
    profile = await load_profile(db, tenant_id, create_if_missing=True)

    if not files:
        raise HTTPException(status_code=400, detail="At least one image is required")

    try:
        uploaded_urls: list[str] = []
        for file in files:
            contents = await file.read()
            upload_result = cloudinary.uploader.upload(
                contents,
                folder=f"zahi_connect/restaurants/{tenant_id}/gallery",
            )
            secure_url = clean_optional_text(upload_result.get("secure_url"))
            if secure_url:
                uploaded_urls.append(secure_url)

        if not uploaded_urls:
            raise HTTPException(status_code=500, detail="Gallery image upload failed")

        profile.gallery_image_urls = merge_gallery_urls(profile.gallery_image_urls, uploaded_urls)
        if not clean_optional_text(profile.cover_image_url):
            profile.cover_image_url = profile.gallery_image_urls[0]

        await db.commit()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Image upload failed: {exc}") from exc

    return await build_settings_payload(db, tenant_id)


@router.patch("/images/cover", response_model=RestaurantSettingsResponse)
async def set_cover_image(
    data: RestaurantCoverImageUpdate,
    tenant_id: uuid.UUID = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    await load_tenant_or_404(db, tenant_id)
    profile = await load_profile(db, tenant_id, create_if_missing=True)
    image_url = clean_optional_text(data.image_url)

    if not image_url:
        raise HTTPException(status_code=400, detail="Image URL is required")

    gallery_urls = normalize_string_list(profile.gallery_image_urls or [])
    if image_url not in gallery_urls:
        raise HTTPException(status_code=400, detail="Image not found in gallery")

    profile.gallery_image_urls = gallery_urls
    profile.cover_image_url = image_url
    await db.commit()
    return await build_settings_payload(db, tenant_id)


@router.delete("/images/gallery", response_model=RestaurantSettingsResponse)
async def remove_gallery_image(
    image_url: str = Query(..., min_length=5),
    tenant_id: uuid.UUID = Depends(get_tenant_id),
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_admin),
):
    await load_tenant_or_404(db, tenant_id)
    profile = await load_profile(db, tenant_id, create_if_missing=True)
    target_url = clean_optional_text(image_url)

    gallery_urls = [
        url
        for url in normalize_string_list(profile.gallery_image_urls or [])
        if url != target_url
    ]
    profile.gallery_image_urls = gallery_urls

    if clean_optional_text(profile.cover_image_url) == target_url:
        profile.cover_image_url = gallery_urls[0] if gallery_urls else None

    await db.commit()
    return await build_settings_payload(db, tenant_id)
