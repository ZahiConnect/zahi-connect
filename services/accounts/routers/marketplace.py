from collections import defaultdict
from decimal import Decimal
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.exceptions import HTTPException
from sqlalchemy import bindparam, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import Tenant

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])

HOTEL_COLLECTIONS = ("settings", "room_types", "rooms", "pricing_defaults")


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text_value = str(value).strip()
    return text_value or None


def to_float(value: Any) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (float, int, Decimal)):
        return float(value)
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


def normalize_image_urls(image_urls: Any, image_url: Any = None) -> list[str]:
    urls: list[str] = []

    if isinstance(image_urls, list):
        urls.extend(str(url).strip() for url in image_urls if str(url).strip())

    fallback = clean_text(image_url)
    if fallback and fallback not in urls:
        urls.append(fallback)

    return urls


def normalize_text_list(values: Any, *, lower: bool = False) -> list[str]:
    if not isinstance(values, list):
        return []

    normalized: list[str] = []
    for value in values:
        cleaned = clean_text(value)
        if not cleaned:
            continue
        final_value = cleaned.lower() if lower else cleaned
        if final_value not in normalized:
            normalized.append(final_value)

    return normalized


def build_public_tenant_payload(tenant: Tenant) -> dict[str, Any]:
    return {
        "id": str(tenant.id),
        "slug": tenant.slug,
        "name": tenant.name,
        "business_type": tenant.business_type,
        "plan": tenant.plan or "free",
        "phone": clean_text(tenant.phone),
        "email": clean_text(tenant.email),
        "address": clean_text(tenant.address),
    }


def normalize_menu_category(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "tenant_id": str(row["tenant_id"]),
        "name": row["name"],
        "description": clean_text(row.get("description")),
        "sort_order": row.get("sort_order") or 0,
        "is_active": bool(row.get("is_active", True)),
    }


def normalize_menu_item(row: dict[str, Any]) -> dict[str, Any]:
    image_urls = normalize_image_urls(row.get("image_urls"), row.get("image_url"))
    dine_in_price = to_float(row.get("dine_in_price")) or 0
    delivery_price = to_float(row.get("delivery_price"))

    return {
        "id": str(row["id"]),
        "tenant_id": str(row["tenant_id"]),
        "category_id": str(row["category_id"]),
        "name": row["name"],
        "description": clean_text(row.get("description")),
        "image_url": image_urls[0] if image_urls else None,
        "image_urls": image_urls,
        "dine_in_price": dine_in_price,
        "delivery_price": delivery_price,
        "display_price": delivery_price or dine_in_price,
        "prep_time_minutes": int(row.get("prep_time_minutes") or 15),
        "food_type": clean_text(row.get("food_type")) or "veg",
        "is_available": bool(row.get("is_available", True)),
    }


def normalize_hotel_settings(payload: dict[str, Any] | None, tenant: Tenant) -> dict[str, Any]:
    payload = payload or {}
    return {
        "display_name": clean_text(payload.get("name")) or tenant.name,
        "address": clean_text(payload.get("addr")) or clean_text(tenant.address),
        "phone": clean_text(payload.get("phone")) or clean_text(tenant.phone),
        "email": clean_text(payload.get("email")) or clean_text(tenant.email),
        "website": clean_text(payload.get("website")),
        "gstin": clean_text(payload.get("gstin")),
        "check_in_time": clean_text(payload.get("checkInTime")) or "14:00",
        "check_out_time": clean_text(payload.get("checkOutTime")) or "11:00",
        "logo": clean_text(payload.get("logo")),
        "signature": clean_text(payload.get("signature")),
        "invoice_footer": clean_text(payload.get("invoiceFooter")),
    }


def normalize_restaurant_profile(row: dict[str, Any] | None) -> dict[str, Any]:
    row = row or {}
    return {
        "tagline": clean_text(row.get("tagline")),
        "description": clean_text(row.get("description")),
        "area_name": clean_text(row.get("area_name")),
        "city": clean_text(row.get("city")),
        "state": clean_text(row.get("state")),
        "postal_code": clean_text(row.get("postal_code")),
        "map_link": clean_text(row.get("map_link")),
        "contact_email": clean_text(row.get("contact_email")),
        "reservation_phone": clean_text(row.get("reservation_phone")),
        "whatsapp_number": clean_text(row.get("whatsapp_number")),
        "cuisine_tags": normalize_text_list(row.get("cuisine_tags")),
        "service_modes": normalize_text_list(row.get("service_modes"), lower=True) or ["dine_in"],
        "opening_time": clean_text(row.get("opening_time")) or "09:00",
        "closing_time": clean_text(row.get("closing_time")) or "22:00",
        "average_prep_minutes": int(row.get("average_prep_minutes") or 20),
        "seating_capacity": row.get("seating_capacity"),
        "price_band": clean_text(row.get("price_band")) or "mid_range",
        "accepts_reservations": bool(row.get("accepts_reservations", True)),
        "cover_image_url": clean_text(row.get("cover_image_url")),
        "gallery_image_urls": normalize_image_urls(row.get("gallery_image_urls")),
    }


def normalize_room(room: dict[str, Any]) -> dict[str, Any]:
    status = clean_text(room.get("status")) or "Available"
    mode = clean_text(room.get("mode")) or "Standard"
    return {
        "id": clean_text(room.get("id")) or clean_text(room.get("roomNumber")) or "",
        "room_number": clean_text(room.get("roomNumber")) or "-",
        "floor": clean_text(room.get("floor")) or "G",
        "type": clean_text(room.get("type")) or "Standard",
        "mode": mode,
        "status": status,
        "notes": clean_text(room.get("notes")),
        "is_available": status.lower() == "available",
    }


def room_sort_key(room: dict[str, Any]) -> tuple[int, str]:
    value = clean_text(room.get("room_number")) or ""
    digits = "".join(character for character in value if character.isdigit())
    return (int(digits) if digits else 10**9, value)


def extract_pricing_defaults(payload: dict[str, Any] | None) -> dict[str, dict[str, float | None]]:
    raw_prices = payload.get("prices") if isinstance(payload, dict) else {}
    normalized: dict[str, dict[str, float | None]] = {}

    if not isinstance(raw_prices, dict):
        return normalized

    for room_type, values in raw_prices.items():
        room_name = clean_text(room_type)
        if not room_name:
            continue
        values = values if isinstance(values, dict) else {}
        normalized[room_name] = {
            "ac": to_float(values.get("ac")),
            "non_ac": to_float(values.get("nonAc")),
        }

    return normalized


def build_room_type_summaries(
    room_type_docs: list[dict[str, Any]],
    rooms: list[dict[str, Any]],
    pricing_defaults: dict[str, dict[str, float | None]],
) -> list[dict[str, Any]]:
    order: list[str] = []
    descriptions: dict[str, str | None] = {}
    doc_ids: dict[str, str] = {}

    for doc in room_type_docs:
        name = clean_text(doc.get("name"))
        if not name:
            continue
        if name not in order:
            order.append(name)
        descriptions[name] = clean_text(doc.get("description"))
        doc_ids[name] = clean_text(doc.get("id")) or name.lower().replace(" ", "-")

    for room in rooms:
        name = clean_text(room.get("type"))
        if name and name not in order:
            order.append(name)
            doc_ids[name] = name.lower().replace(" ", "-")

    summaries: list[dict[str, Any]] = []
    for room_type in order:
        matching_rooms = [room for room in rooms if room.get("type") == room_type]
        rates = pricing_defaults.get(room_type, {})
        ac_price = to_float(rates.get("ac"))
        non_ac_price = to_float(rates.get("non_ac"))
        visible_prices = [price for price in [ac_price, non_ac_price] if price is not None]

        summaries.append(
            {
                "id": doc_ids.get(room_type, room_type.lower().replace(" ", "-")),
                "name": room_type,
                "description": descriptions.get(room_type),
                "total_rooms": len(matching_rooms),
                "available_rooms": sum(1 for room in matching_rooms if room.get("is_available")),
                "modes": sorted({room.get("mode") for room in matching_rooms if room.get("mode")}),
                "ac_price": ac_price,
                "non_ac_price": non_ac_price,
                "starting_price": min(visible_prices) if visible_prices else None,
            }
        )

    return summaries


async def fetch_menu_payload(
    db: AsyncSession,
    tenant_ids: list[Any],
) -> tuple[dict[Any, list[dict[str, Any]]], dict[Any, list[dict[str, Any]]]]:
    categories_by_tenant: dict[Any, list[dict[str, Any]]] = defaultdict(list)
    items_by_tenant: dict[Any, list[dict[str, Any]]] = defaultdict(list)

    if not tenant_ids:
        return categories_by_tenant, items_by_tenant

    categories_stmt = text(
        """
        SELECT id, tenant_id, name, description, sort_order, is_active
        FROM menu_categories
        WHERE tenant_id IN :tenant_ids
        ORDER BY tenant_id, sort_order, name
        """
    ).bindparams(bindparam("tenant_ids", expanding=True))

    items_stmt = text(
        """
        SELECT
            id,
            tenant_id,
            category_id,
            name,
            description,
            image_url,
            image_urls,
            dine_in_price,
            delivery_price,
            prep_time_minutes,
            food_type,
            is_available
        FROM menu_items
        WHERE tenant_id IN :tenant_ids
        ORDER BY tenant_id, name
        """
    ).bindparams(bindparam("tenant_ids", expanding=True))

    category_rows = (await db.execute(categories_stmt, {"tenant_ids": tenant_ids})).mappings().all()
    item_rows = (await db.execute(items_stmt, {"tenant_ids": tenant_ids})).mappings().all()

    for row in category_rows:
        categories_by_tenant[row["tenant_id"]].append(normalize_menu_category(dict(row)))

    for row in item_rows:
        items_by_tenant[row["tenant_id"]].append(normalize_menu_item(dict(row)))

    return categories_by_tenant, items_by_tenant


async def fetch_hotel_documents(
    db: AsyncSession,
    tenant_ids: list[Any],
) -> dict[Any, dict[str, list[dict[str, Any]]]]:
    grouped: dict[Any, dict[str, list[dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))

    if not tenant_ids:
        return grouped

    docs_stmt = text(
        """
        SELECT tenant_id, collection, doc_id, payload
        FROM hotel_documents
        WHERE tenant_id IN :tenant_ids
          AND collection IN :collections
        ORDER BY tenant_id, collection, updated_at DESC
        """
    ).bindparams(
        bindparam("tenant_ids", expanding=True),
        bindparam("collections", expanding=True),
    )

    rows = (
        await db.execute(
            docs_stmt,
            {"tenant_ids": tenant_ids, "collections": list(HOTEL_COLLECTIONS)},
        )
    ).mappings().all()

    for row in rows:
        payload = dict(row.get("payload") or {})
        payload["id"] = row.get("doc_id")
        grouped[row["tenant_id"]][row["collection"]].append(payload)

    return grouped


async def fetch_restaurant_profiles(
    db: AsyncSession,
    tenant_ids: list[Any],
) -> dict[Any, dict[str, Any]]:
    grouped: dict[Any, dict[str, Any]] = {}

    if not tenant_ids:
        return grouped

    table_name = (
        await db.execute(text("SELECT to_regclass('public.restaurant_profiles')"))
    ).scalar_one_or_none()
    if not table_name:
        return grouped

    profiles_stmt = text(
        """
        SELECT
            tenant_id,
            tagline,
            description,
            area_name,
            city,
            state,
            postal_code,
            map_link,
            contact_email,
            reservation_phone,
            whatsapp_number,
            cuisine_tags,
            service_modes,
            opening_time,
            closing_time,
            average_prep_minutes,
            seating_capacity,
            price_band,
            accepts_reservations,
            cover_image_url,
            gallery_image_urls
        FROM restaurant_profiles
        WHERE tenant_id IN :tenant_ids
        """
    ).bindparams(bindparam("tenant_ids", expanding=True))

    rows = (
        await db.execute(profiles_stmt, {"tenant_ids": tenant_ids})
    ).mappings().all()

    for row in rows:
        grouped[row["tenant_id"]] = normalize_restaurant_profile(dict(row))

    return grouped


def build_restaurant_summary(
    tenant: Tenant,
    categories: list[dict[str, Any]],
    items: list[dict[str, Any]],
    profile: dict[str, Any] | None = None,
) -> dict[str, Any]:
    available_items = [item for item in items if item.get("is_available")]
    sorted_featured = sorted(
        available_items,
        key=lambda item: (not bool(item.get("image_url")), item.get("prep_time_minutes", 0), item["name"]),
    )
    price_points = [
        price
        for item in available_items
        for price in [item.get("delivery_price") or item.get("dine_in_price")]
        if price is not None
    ]

    payload = build_public_tenant_payload(tenant)
    profile = normalize_restaurant_profile(profile)
    cover_image = profile.get("cover_image_url") or next(
        (item.get("image_url") for item in sorted_featured if item.get("image_url")),
        None,
    )
    payload.update(
        {
            "cover_image": cover_image,
            "gallery_image_urls": profile.get("gallery_image_urls")
            or ([cover_image] if cover_image else []),
            "category_count": len(categories),
            "item_count": len(items),
            "available_item_count": len(available_items),
            "starting_price": min(price_points) if price_points else None,
            "category_labels": [category["name"] for category in categories[:3]],
            "featured_items": sorted_featured[:4],
            "tagline": profile.get("tagline"),
            "area_name": profile.get("area_name"),
            "city": profile.get("city"),
            "state": profile.get("state"),
            "service_modes": profile.get("service_modes") or ["dine_in"],
            "opening_time": profile.get("opening_time"),
            "closing_time": profile.get("closing_time"),
            "price_band": profile.get("price_band"),
        }
    )
    return payload


def build_restaurant_detail(
    tenant: Tenant,
    categories: list[dict[str, Any]],
    items: list[dict[str, Any]],
    profile: dict[str, Any] | None = None,
) -> dict[str, Any]:
    category_lookup = {category["id"]: category for category in categories}
    grouped_sections: list[dict[str, Any]] = []

    for category in categories:
        category_items = [item for item in items if item["category_id"] == category["id"]]
        grouped_sections.append(
            {
                **category,
                "item_count": len(category_items),
                "items": category_items,
            }
        )

    uncategorized = [item for item in items if item["category_id"] not in category_lookup]
    if uncategorized:
        grouped_sections.append(
            {
                "id": "uncategorized",
                "name": "More to explore",
                "description": "Items without a visible category yet.",
                "sort_order": 999,
                "is_active": True,
                "item_count": len(uncategorized),
                "items": uncategorized,
            }
        )

    summary = build_restaurant_summary(tenant, categories, items, profile)
    return {
        "tenant": build_public_tenant_payload(tenant),
        "summary": summary,
        "profile": normalize_restaurant_profile(profile),
        "categories": categories,
        "menu_sections": grouped_sections,
    }


def build_food_catalog_entry(
    tenant: Tenant,
    category_lookup: dict[str, dict[str, Any]],
    item: dict[str, Any],
    profile: dict[str, Any] | None = None,
) -> dict[str, Any]:
    category = category_lookup.get(item["category_id"], {})
    restaurant = build_public_tenant_payload(tenant)
    profile = normalize_restaurant_profile(profile)
    return {
        **item,
        "category_name": category.get("name"),
        "category_description": category.get("description"),
        "restaurant": restaurant,
        "restaurant_name": restaurant["name"],
        "restaurant_slug": restaurant["slug"],
        "restaurant_address": restaurant.get("address"),
        "restaurant_cover_image": profile.get("cover_image_url"),
        "restaurant_area_name": profile.get("area_name"),
        "restaurant_city": profile.get("city"),
    }


def build_hotel_summary(tenant: Tenant, docs: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    settings = normalize_hotel_settings(
        next((doc for doc in docs.get("settings", []) if doc.get("id") == "hotel"), None),
        tenant,
    )
    rooms = sorted((normalize_room(room) for room in docs.get("rooms", [])), key=room_sort_key)
    room_types = build_room_type_summaries(
        docs.get("room_types", []),
        rooms,
        extract_pricing_defaults(
            next(
                (doc for doc in docs.get("pricing_defaults", []) if doc.get("id") == "defaults"),
                None,
            )
        ),
    )

    visible_prices = [room_type["starting_price"] for room_type in room_types if room_type["starting_price"] is not None]
    payload = build_public_tenant_payload(tenant)
    payload.update(
        {
            "logo": settings.get("logo"),
            "website": settings.get("website"),
            "check_in_time": settings.get("check_in_time"),
            "check_out_time": settings.get("check_out_time"),
            "total_rooms": len(rooms),
            "available_rooms": sum(1 for room in rooms if room.get("is_available")),
            "room_type_count": len(room_types),
            "starting_price": min(visible_prices) if visible_prices else None,
            "room_type_labels": [room_type["name"] for room_type in room_types[:3]],
            "hero_room_types": room_types[:4],
        }
    )
    return payload


def build_hotel_detail(tenant: Tenant, docs: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    settings = normalize_hotel_settings(
        next((doc for doc in docs.get("settings", []) if doc.get("id") == "hotel"), None),
        tenant,
    )
    rooms = sorted((normalize_room(room) for room in docs.get("rooms", [])), key=room_sort_key)
    pricing_defaults = extract_pricing_defaults(
        next(
            (doc for doc in docs.get("pricing_defaults", []) if doc.get("id") == "defaults"),
            None,
        )
    )
    room_types = build_room_type_summaries(docs.get("room_types", []), rooms, pricing_defaults)

    return {
        "tenant": build_public_tenant_payload(tenant),
        "summary": build_hotel_summary(tenant, docs),
        "settings": settings,
        "pricing_defaults": pricing_defaults,
        "room_types": room_types,
        "rooms": rooms,
    }


@router.get("/restaurants")
async def list_restaurants(db: AsyncSession = Depends(get_db)):
    tenants = (
        await db.execute(
            select(Tenant)
            .where(Tenant.is_active.is_(True), Tenant.business_type == "restaurant")
            .order_by(Tenant.created_at.desc())
        )
    ).scalars().all()

    categories_by_tenant, items_by_tenant = await fetch_menu_payload(
        db,
        [tenant.id for tenant in tenants],
    )
    profiles_by_tenant = await fetch_restaurant_profiles(db, [tenant.id for tenant in tenants])

    return [
        build_restaurant_summary(
            tenant,
            categories_by_tenant.get(tenant.id, []),
            items_by_tenant.get(tenant.id, []),
            profiles_by_tenant.get(tenant.id),
        )
        for tenant in tenants
    ]


@router.get("/food-items")
async def list_food_items(db: AsyncSession = Depends(get_db)):
    tenants = (
        await db.execute(
            select(Tenant)
            .where(Tenant.is_active.is_(True), Tenant.business_type == "restaurant")
            .order_by(Tenant.created_at.desc())
        )
    ).scalars().all()

    categories_by_tenant, items_by_tenant = await fetch_menu_payload(
        db,
        [tenant.id for tenant in tenants],
    )
    profiles_by_tenant = await fetch_restaurant_profiles(db, [tenant.id for tenant in tenants])

    food_items: list[dict[str, Any]] = []
    for tenant in tenants:
        category_lookup = {
            category["id"]: category
            for category in categories_by_tenant.get(tenant.id, [])
        }
        available_items = [
            item
            for item in items_by_tenant.get(tenant.id, [])
            if item.get("is_available")
        ]
        for item in available_items:
            food_items.append(
                build_food_catalog_entry(
                    tenant,
                    category_lookup,
                    item,
                    profiles_by_tenant.get(tenant.id),
                )
            )

    return sorted(
        food_items,
        key=lambda item: (
            not bool(item.get("image_url")),
            item.get("restaurant_name") or "",
            item.get("category_name") or "",
            item.get("name") or "",
        ),
    )


@router.get("/restaurants/{slug}")
async def get_restaurant_detail(slug: str, db: AsyncSession = Depends(get_db)):
    tenant = (
        await db.execute(
            select(Tenant).where(
                Tenant.slug == slug,
                Tenant.is_active.is_(True),
                Tenant.business_type == "restaurant",
            )
        )
    ).scalar_one_or_none()

    if not tenant:
        raise HTTPException(status_code=404, detail="Restaurant not found.")

    categories_by_tenant, items_by_tenant = await fetch_menu_payload(db, [tenant.id])
    profiles_by_tenant = await fetch_restaurant_profiles(db, [tenant.id])
    return build_restaurant_detail(
        tenant,
        categories_by_tenant.get(tenant.id, []),
        items_by_tenant.get(tenant.id, []),
        profiles_by_tenant.get(tenant.id),
    )


@router.get("/hotels")
async def list_hotels(db: AsyncSession = Depends(get_db)):
    tenants = (
        await db.execute(
            select(Tenant)
            .where(Tenant.is_active.is_(True), Tenant.business_type == "hotel")
            .order_by(Tenant.created_at.desc())
        )
    ).scalars().all()

    hotel_docs = await fetch_hotel_documents(db, [tenant.id for tenant in tenants])
    return [build_hotel_summary(tenant, hotel_docs.get(tenant.id, {})) for tenant in tenants]


@router.get("/hotels/{slug}")
async def get_hotel_detail(slug: str, db: AsyncSession = Depends(get_db)):
    tenant = (
        await db.execute(
            select(Tenant).where(
                Tenant.slug == slug,
                Tenant.is_active.is_(True),
                Tenant.business_type == "hotel",
            )
        )
    ).scalar_one_or_none()

    if not tenant:
        raise HTTPException(status_code=404, detail="Hotel not found.")

    hotel_docs = await fetch_hotel_documents(db, [tenant.id])
    return build_hotel_detail(tenant, hotel_docs.get(tenant.id, {}))
