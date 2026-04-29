from collections import defaultdict
from decimal import Decimal
from math import asin, cos, radians, sin, sqrt
import re
from typing import Any

import httpx
from fastapi import APIRouter, Depends
from fastapi.exceptions import HTTPException
from sqlalchemy import bindparam, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import Tenant

router = APIRouter(prefix="/marketplace", tags=["Marketplace"])

HOTEL_COLLECTIONS = ("settings", "room_types", "rooms", "pricing_defaults")
HOTEL_DETAIL_COLLECTIONS = (*HOTEL_COLLECTIONS, "pricing")
FLIGHT_COLLECTIONS = ("settings", "flights", "flight_types", "bookings")
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_HEADERS = {
    "User-Agent": "ZahiConnectMarketplace/1.0 (customer distance enrichment)",
}
GEOCODE_CACHE: dict[str, dict[str, Any] | None] = {}


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


def extract_coordinates_from_map_link(value: Any) -> tuple[float | None, float | None]:
    map_link = clean_text(value)
    if not map_link:
        return (None, None)

    match = re.search(r"(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)", map_link)
    if not match:
        return (None, None)

    latitude = to_float(match.group(1))
    longitude = to_float(match.group(2))
    return (latitude, longitude)


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
    gallery_image_urls = normalize_image_urls(
        payload.get("galleryImages") or payload.get("gallery_image_urls")
    )
    cover_image = clean_text(payload.get("coverImage") or payload.get("cover_image")) or (
        gallery_image_urls[0] if gallery_image_urls else None
    )
    map_link = clean_text(payload.get("mapLink") or payload.get("map_link"))
    map_link_latitude, map_link_longitude = extract_coordinates_from_map_link(map_link)
    latitude = to_float(payload.get("latitude"))
    longitude = to_float(payload.get("longitude"))
    if latitude is None:
        latitude = map_link_latitude
    if longitude is None:
        longitude = map_link_longitude
    if cover_image:
        gallery_image_urls = [cover_image, *[url for url in gallery_image_urls if url != cover_image]]
    elif clean_text(payload.get("logo")):
        gallery_image_urls = normalize_image_urls(gallery_image_urls, payload.get("logo"))

    return {
        "display_name": clean_text(payload.get("name") or payload.get("display_name")) or tenant.name,
        "address": clean_text(payload.get("addr") or payload.get("address")) or clean_text(tenant.address),
        "phone": clean_text(payload.get("phone")) or clean_text(tenant.phone),
        "email": clean_text(payload.get("email")) or clean_text(tenant.email),
        "website": clean_text(payload.get("website")),
        "gstin": clean_text(payload.get("gstin")),
        "check_in_time": clean_text(payload.get("checkInTime") or payload.get("check_in_time")) or "14:00",
        "check_out_time": clean_text(payload.get("checkOutTime") or payload.get("check_out_time")) or "11:00",
        "tagline": clean_text(payload.get("tagline")),
        "description": clean_text(payload.get("description")),
        "property_type": clean_text(payload.get("propertyType") or payload.get("property_type")),
        "featured_amenities": normalize_text_list(
            payload.get("featuredAmenities") or payload.get("featured_amenities")
        ),
        "cover_image": cover_image or clean_text(payload.get("logo")),
        "gallery_image_urls": gallery_image_urls
        or ([cover_image] if cover_image else [])
        or normalize_image_urls(None, payload.get("logo")),
        "logo": clean_text(payload.get("logo")),
        "signature": clean_text(payload.get("signature")),
        "invoice_footer": clean_text(payload.get("invoiceFooter") or payload.get("invoice_footer")),
        "map_link": map_link
        or (
            f"https://www.google.com/maps/search/?api=1&query={latitude},{longitude}"
            if latitude is not None and longitude is not None
            else None
        ),
        "latitude": latitude,
        "longitude": longitude,
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
        "latitude": to_float(row.get("latitude")),
        "longitude": to_float(row.get("longitude")),
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


def build_restaurant_geocode_query(tenant: Tenant, profile: dict[str, Any]) -> str | None:
    parts = [
        clean_text(profile.get("area_name")),
        clean_text(profile.get("city")),
        clean_text(profile.get("state")),
        clean_text(tenant.address),
    ]
    unique_parts: list[str] = []
    for part in parts:
        if part and part not in unique_parts:
            unique_parts.append(part)

    if not unique_parts:
        return None

    return ", ".join(unique_parts)


def build_hotel_geocode_query(tenant: Tenant, settings: dict[str, Any]) -> str | None:
    parts = [
        clean_text(settings.get("address")),
        clean_text(tenant.address),
    ]
    unique_parts: list[str] = []
    for part in parts:
        if part and part not in unique_parts:
            unique_parts.append(part)

    if not unique_parts:
        return None

    query = ", ".join(unique_parts)
    if "," not in query and len(query.split()) < 2:
        return None

    return query


async def geocode_location(query: str) -> dict[str, Any] | None:
    if query in GEOCODE_CACHE:
        return GEOCODE_CACHE[query]

    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True) as client:
            response = await client.get(
                NOMINATIM_URL,
                params={
                    "format": "jsonv2",
                    "limit": 1,
                    "addressdetails": 1,
                    "q": query,
                },
                headers=NOMINATIM_HEADERS,
            )
            response.raise_for_status()
            payload = response.json()
    except Exception:
        GEOCODE_CACHE[query] = None
        return None

    if not isinstance(payload, list) or not payload:
        GEOCODE_CACHE[query] = None
        return None

    first_match = payload[0]
    latitude = to_float(first_match.get("lat"))
    longitude = to_float(first_match.get("lon"))
    if latitude is None or longitude is None:
        GEOCODE_CACHE[query] = None
        return None

    address = first_match.get("address") or {}
    result = {
        "latitude": latitude,
        "longitude": longitude,
        "area_name": clean_text(
            address.get("suburb")
            or address.get("neighbourhood")
            or address.get("quarter")
            or address.get("city_district")
            or address.get("town")
            or address.get("village")
            or address.get("municipality")
            or address.get("county")
        ),
        "city": clean_text(
            address.get("city")
            or address.get("town")
            or address.get("village")
            or address.get("municipality")
            or address.get("state_district")
            or address.get("county")
        ),
        "state": clean_text(address.get("state")),
    }
    GEOCODE_CACHE[query] = result
    return result


async def enrich_restaurant_profiles_with_coordinates(
    db: AsyncSession,
    tenants: list[Tenant],
    profiles_by_tenant: dict[Any, dict[str, Any]],
) -> dict[Any, dict[str, Any]]:
    pending_db_updates: list[dict[str, Any]] = []

    for tenant in tenants:
        raw_profile = profiles_by_tenant.get(tenant.id)
        profile = normalize_restaurant_profile(raw_profile)

        if profile.get("latitude") is not None and profile.get("longitude") is not None:
            profiles_by_tenant[tenant.id] = profile
            continue

        query = build_restaurant_geocode_query(tenant, profile)
        if not query:
            profiles_by_tenant[tenant.id] = profile
            continue

        geocoded = await geocode_location(query)
        if not geocoded:
            profiles_by_tenant[tenant.id] = profile
            continue

        profile["latitude"] = geocoded["latitude"]
        profile["longitude"] = geocoded["longitude"]
        profile["area_name"] = profile.get("area_name") or geocoded.get("area_name")
        profile["city"] = profile.get("city") or geocoded.get("city")
        profile["state"] = profile.get("state") or geocoded.get("state")
        if not profile.get("map_link"):
            profile["map_link"] = (
                "https://www.google.com/maps/search/?api=1&query="
                f"{profile['latitude']},{profile['longitude']}"
            )

        profiles_by_tenant[tenant.id] = profile

        if raw_profile is not None:
            pending_db_updates.append(
                {
                    "tenant_id": tenant.id,
                    "latitude": profile["latitude"],
                    "longitude": profile["longitude"],
                    "area_name": profile.get("area_name"),
                    "city": profile.get("city"),
                    "state": profile.get("state"),
                    "map_link": profile.get("map_link"),
                }
            )

    if pending_db_updates:
        update_stmt = text(
            """
            UPDATE restaurant_profiles
            SET
                latitude = COALESCE(latitude, :latitude),
                longitude = COALESCE(longitude, :longitude),
                area_name = COALESCE(area_name, :area_name),
                city = COALESCE(city, :city),
                state = COALESCE(state, :state),
                map_link = COALESCE(map_link, :map_link),
                updated_at = NOW()
            WHERE tenant_id = :tenant_id
            """
        )
        for payload in pending_db_updates:
            await db.execute(update_stmt, payload)
        await db.commit()

    return profiles_by_tenant


async def enrich_hotel_documents_with_coordinates(
    tenants: list[Tenant],
    hotel_docs: dict[Any, dict[str, list[dict[str, Any]]]],
) -> dict[Any, dict[str, list[dict[str, Any]]]]:
    for tenant in tenants:
        docs = hotel_docs.get(tenant.id, {})
        settings_docs = docs.get("settings", [])
        raw_settings = next((doc for doc in settings_docs if doc.get("id") == "hotel"), None)
        settings = normalize_hotel_settings(raw_settings, tenant)

        if settings.get("latitude") is not None and settings.get("longitude") is not None:
            continue

        query = build_hotel_geocode_query(tenant, settings)
        if not query:
            continue

        geocoded = await geocode_location(query)
        if not geocoded:
            continue

        enriched_settings = dict(raw_settings or {})
        if not raw_settings:
            enriched_settings["id"] = "hotel"
            settings_docs.insert(0, enriched_settings)

        if not clean_text(enriched_settings.get("addr")) and settings.get("address"):
            enriched_settings["addr"] = settings["address"]
        if not clean_text(enriched_settings.get("mapLink")) and not clean_text(enriched_settings.get("map_link")):
            enriched_settings["mapLink"] = (
                "https://www.google.com/maps/search/?api=1&query="
                f"{geocoded['latitude']},{geocoded['longitude']}"
            )
        if enriched_settings.get("latitude") in [None, ""]:
            enriched_settings["latitude"] = geocoded["latitude"]
        if enriched_settings.get("longitude") in [None, ""]:
            enriched_settings["longitude"] = geocoded["longitude"]

        docs["settings"] = settings_docs
        hotel_docs[tenant.id] = docs

    return hotel_docs


def compute_distance_km(
    origin_latitude: float | None,
    origin_longitude: float | None,
    target_latitude: float | None,
    target_longitude: float | None,
) -> float | None:
    if None in [origin_latitude, origin_longitude, target_latitude, target_longitude]:
        return None

    earth_radius_km = 6371
    delta_latitude = radians(target_latitude - origin_latitude)
    delta_longitude = radians(target_longitude - origin_longitude)

    haversine = (
        sin(delta_latitude / 2) ** 2
        + cos(radians(origin_latitude))
        * cos(radians(target_latitude))
        * sin(delta_longitude / 2) ** 2
    )
    return round(2 * earth_radius_km * asin(sqrt(haversine)), 2)


def normalize_room(room: dict[str, Any]) -> dict[str, Any]:
    status = clean_text(room.get("status")) or "Available"
    mode = clean_text(room.get("mode")) or "Standard"
    base_price = to_float(
        room.get("basePrice")
        or room.get("base_price")
        or room.get("pricePerNight")
        or room.get("price_per_night")
        or room.get("nightlyRate")
        or room.get("nightly_rate")
        or room.get("rate")
    )
    image_urls = normalize_image_urls(
        room.get("image_urls") or room.get("imageUrls"),
        room.get("image_url") or room.get("imageUrl"),
    )
    return {
        "id": clean_text(room.get("id")) or clean_text(room.get("roomNumber")) or "",
        "room_number": clean_text(room.get("roomNumber")) or "-",
        "floor": clean_text(room.get("floor")) or "G",
        "type": clean_text(room.get("type")) or "Standard",
        "mode": mode,
        "status": status,
        "notes": clean_text(room.get("notes")),
        "base_price": base_price,
        "basePrice": base_price,
        "image_url": image_urls[0] if image_urls else None,
        "image_urls": image_urls,
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


def extract_pricing_calendar(payloads: list[dict[str, Any]] | None) -> dict[str, dict[str, dict[str, float | None]]]:
    normalized: dict[str, dict[str, dict[str, float | None]]] = {}

    for payload in payloads or []:
        date_key = clean_text(payload.get("date") or payload.get("id"))
        raw_prices = payload.get("prices")
        if not date_key or not isinstance(raw_prices, dict):
            continue

        day_prices: dict[str, dict[str, float | None]] = {}
        for room_type, values in raw_prices.items():
            room_name = clean_text(room_type)
            if not room_name:
                continue
            values = values if isinstance(values, dict) else {}
            day_prices[room_name] = {
                "ac": to_float(values.get("ac")),
                "non_ac": to_float(values.get("nonAc") or values.get("non_ac")),
            }

        if day_prices:
            normalized[date_key] = day_prices

    return normalized


def mode_price(prices: dict[str, float | None], mode: Any) -> float | None:
    normalized_mode = re.sub(r"[\s_-]+", "", str(mode or "").strip().lower())
    if normalized_mode == "ac":
        return to_float(prices.get("ac"))
    if normalized_mode == "nonac":
        return to_float(prices.get("non_ac"))

    visible_prices = [
        price
        for price in [to_float(prices.get("ac")), to_float(prices.get("non_ac"))]
        if price is not None and price > 0
    ]
    return min(visible_prices) if visible_prices else None


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
        visible_prices: list[float] = []
        for room in matching_rooms:
            effective_price = mode_price(rates, room.get("mode"))
            if effective_price is None or effective_price <= 0:
                effective_price = to_float(room.get("base_price"))
            if effective_price is not None and effective_price > 0:
                visible_prices.append(effective_price)
        if not visible_prices:
            visible_prices = [
                price
                for price in [ac_price, non_ac_price]
                if price is not None and price > 0
            ]
        room_images = normalize_image_urls(
            [
                url
                for room in matching_rooms
                for url in room.get("image_urls", [])
            ]
        )

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
                "image_url": room_images[0] if room_images else None,
                "image_urls": room_images,
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
    collections: tuple[str, ...] = HOTEL_COLLECTIONS,
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
            {"tenant_ids": tenant_ids, "collections": list(collections)},
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
            latitude,
            longitude,
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
    distance_km: float | None = None,
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
            "latitude": profile.get("latitude"),
            "longitude": profile.get("longitude"),
            "distance_km": distance_km,
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
    distance_km: float | None = None,
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

    summary = build_restaurant_summary(tenant, categories, items, profile, distance_km)
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
    distance_km: float | None = None,
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
        "restaurant_latitude": profile.get("latitude"),
        "restaurant_longitude": profile.get("longitude"),
        "distance_km": distance_km,
    }


def build_hotel_summary(
    tenant: Tenant,
    docs: dict[str, list[dict[str, Any]]],
    distance_km: float | None = None,
) -> dict[str, Any]:
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

    visible_prices = [room_type["starting_price"] for room_type in room_types if room_type.get("starting_price") is not None and room_type["starting_price"] > 0]
    payload = build_public_tenant_payload(tenant)
    payload.update(
        {
            "address": settings.get("address") or tenant.address,
            "name": settings.get("display_name") or tenant.name,
            "display_name": settings.get("display_name") or tenant.name,
            "logo": settings.get("logo"),
            "cover_image": settings.get("cover_image") or settings.get("logo"),
            "gallery_image_urls": settings.get("gallery_image_urls")
            or normalize_image_urls(None, settings.get("cover_image") or settings.get("logo")),
            "tagline": settings.get("tagline"),
            "description": settings.get("description"),
            "property_type": settings.get("property_type"),
            "featured_amenities": settings.get("featured_amenities") or [],
            "map_link": settings.get("map_link"),
            "latitude": settings.get("latitude"),
            "longitude": settings.get("longitude"),
            "distance_km": distance_km,
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


def build_hotel_detail(
    tenant: Tenant,
    docs: dict[str, list[dict[str, Any]]],
    distance_km: float | None = None,
) -> dict[str, Any]:
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
    summary = build_hotel_summary(tenant, docs, distance_km)

    return {
        "tenant": build_public_tenant_payload(tenant),
        "summary": summary,
        "settings": settings,
        "pricing_defaults": pricing_defaults,
        "pricing_calendar": extract_pricing_calendar(docs.get("pricing", [])),
        "room_types": room_types,
        "rooms": rooms,
    }


@router.get("/restaurants")
async def list_restaurants(
    latitude: float | None = None,
    longitude: float | None = None,
    db: AsyncSession = Depends(get_db),
):
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
    profiles_by_tenant = await enrich_restaurant_profiles_with_coordinates(
        db,
        tenants,
        profiles_by_tenant,
    )

    summaries = [
        build_restaurant_summary(
            tenant,
            categories_by_tenant.get(tenant.id, []),
            items_by_tenant.get(tenant.id, []),
            profiles_by_tenant.get(tenant.id),
            compute_distance_km(
                latitude,
                longitude,
                profiles_by_tenant.get(tenant.id, {}).get("latitude"),
                profiles_by_tenant.get(tenant.id, {}).get("longitude"),
            ),
        )
        for tenant in tenants
    ]

    return sorted(
        summaries,
        key=lambda restaurant: (
            restaurant.get("distance_km") is None,
            restaurant.get("distance_km") or 0,
            restaurant.get("name") or "",
        ),
    )


@router.get("/food-items")
async def list_food_items(
    latitude: float | None = None,
    longitude: float | None = None,
    db: AsyncSession = Depends(get_db),
):
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
    profiles_by_tenant = await enrich_restaurant_profiles_with_coordinates(
        db,
        tenants,
        profiles_by_tenant,
    )

    food_items: list[dict[str, Any]] = []
    for tenant in tenants:
        profile = profiles_by_tenant.get(tenant.id, {})
        distance_km = compute_distance_km(
            latitude,
            longitude,
            profile.get("latitude"),
            profile.get("longitude"),
        )
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
                    profile,
                    distance_km,
                )
            )

    return sorted(
        food_items,
        key=lambda item: (
            item.get("distance_km") is None,
            item.get("distance_km") or 0,
            item.get("restaurant_name") or "",
            item.get("category_name") or "",
            item.get("name") or "",
        ),
    )


@router.get("/restaurants/{slug}")
async def get_restaurant_detail(
    slug: str,
    latitude: float | None = None,
    longitude: float | None = None,
    db: AsyncSession = Depends(get_db),
):
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
    profiles_by_tenant = await enrich_restaurant_profiles_with_coordinates(
        db,
        [tenant],
        profiles_by_tenant,
    )
    return build_restaurant_detail(
        tenant,
        categories_by_tenant.get(tenant.id, []),
        items_by_tenant.get(tenant.id, []),
        profiles_by_tenant.get(tenant.id),
        compute_distance_km(
            latitude,
            longitude,
            profiles_by_tenant.get(tenant.id, {}).get("latitude"),
            profiles_by_tenant.get(tenant.id, {}).get("longitude"),
        ),
    )


@router.get("/hotels")
async def list_hotels(
    latitude: float | None = None,
    longitude: float | None = None,
    db: AsyncSession = Depends(get_db),
):
    tenants = (
        await db.execute(
            select(Tenant)
            .where(Tenant.is_active.is_(True), Tenant.business_type == "hotel")
            .order_by(Tenant.created_at.desc())
        )
    ).scalars().all()

    hotel_docs = await fetch_hotel_documents(db, [tenant.id for tenant in tenants])
    hotel_docs = await enrich_hotel_documents_with_coordinates(tenants, hotel_docs)
    summaries = []

    for tenant in tenants:
        summary = build_hotel_summary(tenant, hotel_docs.get(tenant.id, {}))
        summary["distance_km"] = compute_distance_km(
            latitude,
            longitude,
            summary.get("latitude"),
            summary.get("longitude"),
        )
        summaries.append(summary)

    return sorted(
        summaries,
        key=lambda hotel: (
            hotel.get("distance_km") is None,
            hotel.get("distance_km") or 0,
            hotel.get("name") or "",
        ),
    )


@router.get("/hotels/{slug}")
async def get_hotel_detail(
    slug: str,
    latitude: float | None = None,
    longitude: float | None = None,
    db: AsyncSession = Depends(get_db),
):
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

    hotel_docs = await fetch_hotel_documents(db, [tenant.id], HOTEL_DETAIL_COLLECTIONS)
    hotel_docs = await enrich_hotel_documents_with_coordinates([tenant], hotel_docs)
    summary = build_hotel_summary(tenant, hotel_docs.get(tenant.id, {}))
    distance_km = compute_distance_km(
        latitude,
        longitude,
        summary.get("latitude"),
        summary.get("longitude"),
    )
    return build_hotel_detail(tenant, hotel_docs.get(tenant.id, {}), distance_km)


# ══════════════════════════════════════════════════════════════════════
# FLIGHT MARKETPLACE
# ══════════════════════════════════════════════════════════════════════


async def fetch_flight_documents(
    db: AsyncSession,
    tenant_ids: list[Any],
) -> dict[Any, dict[str, list[dict[str, Any]]]]:
    """Read flight_documents rows for the given tenant IDs (mirrors fetch_hotel_documents)."""
    grouped: dict[Any, dict[str, list[dict[str, Any]]]] = defaultdict(lambda: defaultdict(list))

    if not tenant_ids:
        return grouped

    # Safeguard: table may not exist yet if flight service hasn't been started
    table_exists = (
        await db.execute(text("SELECT to_regclass('public.flight_documents')"))
    ).scalar_one_or_none()
    if not table_exists:
        return grouped

    docs_stmt = text(
        """
        SELECT tenant_id, collection, doc_id, payload
        FROM flight_documents
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
            {"tenant_ids": tenant_ids, "collections": list(FLIGHT_COLLECTIONS)},
        )
    ).mappings().all()

    for row in rows:
        payload = dict(row.get("payload") or {})
        payload["id"] = row.get("doc_id")
        grouped[row["tenant_id"]][row["collection"]].append(payload)

    await enrich_flight_booking_documents_with_payment_metadata(db, grouped)
    return grouped


def normalize_flight_settings(payload: dict[str, Any] | None, tenant: "Tenant") -> dict[str, Any]:
    """Normalize the airline settings document (stored under collection='settings', doc_id='flight')."""
    payload = payload or {}
    gallery = normalize_image_urls(payload.get("galleryImages") or [])
    cover = clean_text(payload.get("coverImage")) or (gallery[0] if gallery else None)
    if cover and cover not in gallery:
        gallery = [cover, *gallery]

    return {
        "display_name": clean_text(payload.get("name")) or tenant.name,
        "iata_code": clean_text(payload.get("iataCode")),
        "hub_airport": clean_text(payload.get("hubAirport")),
        "address": clean_text(payload.get("addr")) or clean_text(tenant.address),
        "phone": clean_text(payload.get("phone")) or clean_text(tenant.phone),
        "email": clean_text(payload.get("email")) or clean_text(tenant.email),
        "website": clean_text(payload.get("website")),
        "tagline": clean_text(payload.get("tagline")),
        "description": clean_text(payload.get("description")),
        "logo": clean_text(payload.get("logo")),
        "cover_image": cover or clean_text(payload.get("logo")),
        "gallery_image_urls": gallery or ([cover] if cover else []),
    }


def normalize_scheduled_flight(doc: dict[str, Any]) -> dict[str, Any]:
    """Normalise a single scheduled-flight document from the 'flights' collection."""
    days_raw = doc.get("daysOfWeek") or doc.get("days_of_week") or []
    days = days_raw if isinstance(days_raw, list) else []

    economy_price = to_float(doc.get("economyPrice") or doc.get("economy_price"))
    business_price = to_float(doc.get("businessPrice") or doc.get("business_price"))
    first_price = to_float(doc.get("firstPrice") or doc.get("first_price"))
    visible_prices = [p for p in [economy_price, business_price, first_price] if p is not None and p > 0]

    return {
        "id": clean_text(doc.get("id")) or "",
        "flight_number": clean_text(doc.get("flightNumber") or doc.get("flight_number")) or "-",
        "from_city": clean_text(doc.get("from") or doc.get("fromCity") or doc.get("from_city")) or "-",
        "to_city": clean_text(doc.get("to") or doc.get("toCity") or doc.get("to_city")) or "-",
        "depart_time": clean_text(doc.get("departTime") or doc.get("depart_time")) or "",
        "arrive_time": clean_text(doc.get("arriveTime") or doc.get("arrive_time")) or "",
        "duration_min": int(doc.get("durationMin") or doc.get("duration_min") or 0),
        "days_of_week": days,
        "total_seats": int(doc.get("totalSeats") or doc.get("total_seats") or 0),
        "economy_seats": int(doc.get("economySeats") or doc.get("economy_seats") or 0),
        "business_seats": int(doc.get("businessSeats") or doc.get("business_seats") or 0),
        "first_seats": int(doc.get("firstSeats") or doc.get("first_seats") or 0),
        "economy_price": economy_price,
        "business_price": business_price,
        "first_price": first_price,
        "starting_price": min(visible_prices) if visible_prices else None,
        "aircraft_type": clean_text(doc.get("aircraftType") or doc.get("aircraft_type")),
        "status": clean_text(doc.get("status")) or "Active",
        "image_url": clean_text(doc.get("imageUrl") or doc.get("image_url")),
        "is_active": (clean_text(doc.get("status")) or "Active").lower() == "active",
    }


def normalize_flight_cabin_key(value: Any) -> str:
    cabin = (clean_text(value) or "economy").lower()
    if "business" in cabin:
        return "business"
    if "first" in cabin:
        return "first"
    return "economy"


def normalize_flight_seats(value: Any) -> list[str]:
    if isinstance(value, list):
        raw_values = value
    else:
        raw_text = clean_text(value)
        if not raw_text:
            return []
        raw_values = re.split(r"[,/|\s]+", raw_text)

    seats: list[str] = []
    for item in raw_values:
        seat = clean_text(item)
        if seat and seat.upper() not in seats:
            seats.append(seat.upper())
    return seats


def normalize_flight_cabin_label(value: Any) -> str:
    cabin = normalize_flight_cabin_key(value)
    if cabin == "business":
        return "Business"
    if cabin == "first":
        return "First"
    return "Economy"


def apply_flight_payment_metadata(doc: dict[str, Any], metadata: dict[str, Any]) -> dict[str, Any]:
    if not metadata:
        return doc

    seats = normalize_flight_seats(
        doc.get("seats")
        or doc.get("seatNumber")
        or doc.get("seat_number")
        or metadata.get("seats")
        or metadata.get("seatNumber")
    )
    booking_date = clean_text(doc.get("bookingDate"))
    enriched = dict(doc)
    enriched["passengerName"] = (
        clean_text(enriched.get("passengerName"))
        or clean_text(metadata.get("lead_passenger"))
        or clean_text(metadata.get("passenger_name"))
        or clean_text(enriched.get("customerName"))
        or "Guest Passenger"
    )
    enriched["phone"] = (
        clean_text(enriched.get("phone"))
        or clean_text(metadata.get("contact_number"))
        or clean_text(metadata.get("phone"))
        or ""
    )
    enriched["email"] = (
        clean_text(enriched.get("email"))
        or clean_text(enriched.get("customerEmail"))
        or clean_text(metadata.get("email"))
        or ""
    )
    enriched["flightNumber"] = clean_text(enriched.get("flightNumber")) or clean_text(metadata.get("flight_number"))
    enriched["date"] = (
        clean_text(enriched.get("date"))
        or clean_text(metadata.get("date"))
        or clean_text(metadata.get("departure_date"))
        or (booking_date[:10] if booking_date else "")
    )
    enriched["travellers"] = enriched.get("travellers") or metadata.get("passengers") or enriched.get("passengerCount") or 1
    enriched["class"] = normalize_flight_cabin_label(enriched.get("class") or metadata.get("class"))
    enriched["seats"] = seats
    enriched["seatNumber"] = ", ".join(seats)
    enriched["originCode"] = clean_text(enriched.get("originCode")) or clean_text(metadata.get("origin_code"))
    enriched["destinationCode"] = clean_text(enriched.get("destinationCode")) or clean_text(metadata.get("destination_code"))
    return enriched


async def enrich_flight_booking_documents_with_payment_metadata(
    db: AsyncSession,
    grouped_docs: dict[Any, dict[str, list[dict[str, Any]]]],
) -> None:
    payment_ids: list[str] = []
    for docs in grouped_docs.values():
        for booking in docs.get("bookings", []):
            payment_id = clean_text(booking.get("razorpayPaymentId"))
            if payment_id:
                payment_ids.append(payment_id)

    if not payment_ids:
        return

    table_exists = (
        await db.execute(text("SELECT to_regclass('public.booking_payment_orders')"))
    ).scalar_one_or_none()
    if not table_exists:
        return

    rows = (
        await db.execute(
            text(
                """
                SELECT razorpay_payment_id, metadata
                FROM booking_payment_orders
                WHERE service_type = 'flight'
                  AND razorpay_payment_id IN :payment_ids
                """
            ).bindparams(bindparam("payment_ids", expanding=True)),
            {"payment_ids": list(dict.fromkeys(payment_ids))},
        )
    ).mappings().all()

    metadata_by_payment = {
        clean_text(row["razorpay_payment_id"]): dict(row.get("metadata") or {})
        for row in rows
        if clean_text(row["razorpay_payment_id"])
    }

    for docs in grouped_docs.values():
        docs["bookings"] = [
            apply_flight_payment_metadata(
                booking,
                metadata_by_payment.get(clean_text(booking.get("razorpayPaymentId")), {}),
            )
            for booking in docs.get("bookings", [])
        ]


def normalize_public_flight_booking(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": clean_text(doc.get("id")) or "",
        "flight_number": clean_text(doc.get("flightNumber") or doc.get("flight_number")) or "",
        "date": clean_text(doc.get("date") or doc.get("departureDate") or doc.get("departure_date")) or "",
        "class": normalize_flight_cabin_key(doc.get("class") or doc.get("cabinClass")),
        "seats": normalize_flight_seats(doc.get("seats") or doc.get("seatNumber") or doc.get("seat_number")),
        "travellers": int(to_float(doc.get("travellers") or doc.get("passengers") or doc.get("passengerCount")) or 1),
        "status": clean_text(doc.get("status")) or "Confirmed",
    }


def attach_public_booked_seats(
    flights: list[dict[str, Any]],
    booking_docs: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    bookings_by_flight: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for doc in booking_docs:
        booking = normalize_public_flight_booking(doc)
        if not booking["flight_number"]:
            continue
        if booking["status"].lower() == "cancelled":
            continue
        bookings_by_flight[booking["flight_number"]].append(booking)

    enriched: list[dict[str, Any]] = []
    for flight in flights:
        flight_number = flight.get("flight_number") or ""
        booked_seats_by_date: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))
        booked_counts_by_date: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

        for booking in bookings_by_flight.get(flight_number, []):
            date_key = booking["date"]
            if not date_key:
                continue

            cabin_key = booking["class"]
            seats = booking["seats"]
            booked_counts_by_date[date_key][cabin_key] += len(seats) or booking["travellers"]
            for seat in seats:
                if seat not in booked_seats_by_date[date_key][cabin_key]:
                    booked_seats_by_date[date_key][cabin_key].append(seat)

        enriched.append(
            {
                **flight,
                "booked_seats_by_date": {
                    date: {cabin: sorted(seats) for cabin, seats in cabins.items()}
                    for date, cabins in booked_seats_by_date.items()
                },
                "booked_counts_by_date": {
                    date: dict(cabins)
                    for date, cabins in booked_counts_by_date.items()
                },
            }
        )

    return enriched


def build_flight_summary(tenant: "Tenant", docs: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    """Build the list-level summary for a flight operator tenant."""
    settings_doc = next(
        (doc for doc in docs.get("settings", []) if doc.get("id") == "flight"), None
    )
    settings = normalize_flight_settings(settings_doc, tenant)
    flights = [
        normalize_scheduled_flight(doc)
        for doc in docs.get("flights", [])
        if (clean_text(doc.get("status")) or "Active").lower() == "active"
    ]

    visible_prices = [
        f["starting_price"] for f in flights if f.get("starting_price") is not None
    ]
    routes = sorted(
        {f"{f['from_city']} → {f['to_city']}" for f in flights if f["from_city"] and f["to_city"]}
    )

    payload = build_public_tenant_payload(tenant)
    payload.update(
        {
            "name": settings["display_name"],
            "display_name": settings["display_name"],
            "iata_code": settings["iata_code"],
            "hub_airport": settings["hub_airport"],
            "logo": settings["logo"],
            "cover_image": settings["cover_image"],
            "gallery_image_urls": settings["gallery_image_urls"],
            "tagline": settings["tagline"],
            "description": settings["description"],
            "total_flights": len(flights),
            "routes": routes[:5],
            "starting_price": min(visible_prices) if visible_prices else None,
        }
    )
    return payload


def build_flight_detail(tenant: "Tenant", docs: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    """Build the full detail payload for a single flight operator."""
    settings_doc = next(
        (doc for doc in docs.get("settings", []) if doc.get("id") == "flight"), None
    )
    settings = normalize_flight_settings(settings_doc, tenant)
    all_flights = [
        normalize_scheduled_flight(doc) for doc in docs.get("flights", [])
    ]
    all_flights = attach_public_booked_seats(all_flights, docs.get("bookings", []))
    active_flights = [f for f in all_flights if f["is_active"]]

    fare_classes = [
        {
            "id": doc.get("id") or doc.get("name", "").lower(),
            "name": clean_text(doc.get("name")) or "",
            "description": clean_text(doc.get("description")),
        }
        for doc in docs.get("flight_types", [])
    ]

    summary = build_flight_summary(tenant, docs)
    return {
        "tenant": build_public_tenant_payload(tenant),
        "summary": summary,
        "settings": settings,
        "flights": active_flights,
        "all_flights": all_flights,
        "fare_classes": fare_classes,
    }


@router.get("/flights")
async def list_flights(db: AsyncSession = Depends(get_db)):
    """List all active flight operator tenants (subscribed to a flight plan)."""
    tenants = (
        await db.execute(
            select(Tenant)
            .where(Tenant.is_active.is_(True), Tenant.business_type == "flight")
            .order_by(Tenant.created_at.desc())
        )
    ).scalars().all()

    flight_docs = await fetch_flight_documents(db, [t.id for t in tenants])
    return [build_flight_summary(t, flight_docs.get(t.id, {})) for t in tenants]


@router.get("/flights/{slug}")
async def get_flight_detail(slug: str, db: AsyncSession = Depends(get_db)):
    """Get full flight operator detail including all scheduled flights."""
    tenant = (
        await db.execute(
            select(Tenant).where(
                Tenant.slug == slug,
                Tenant.is_active.is_(True),
                Tenant.business_type == "flight",
            )
        )
    ).scalar_one_or_none()

    if not tenant:
        raise HTTPException(status_code=404, detail="Airline not found.")

    flight_docs = await fetch_flight_documents(db, [tenant.id])
    return build_flight_detail(tenant, flight_docs.get(tenant.id, {}))
