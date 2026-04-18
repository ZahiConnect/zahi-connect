import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BedDouble, CalendarDays, Hotel, Search, SlidersHorizontal, Users } from "lucide-react";

import marketplaceService from "../services/marketplaceService";
import { formatAddress, formatCurrency, formatDateRange } from "../lib/format";

const HotelsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableOnly, setAvailableOnly] = useState(false);

  const query = searchParams.get("query") || "";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const guests = Number(searchParams.get("guests") || "2");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await marketplaceService.getHotels();
        if (active) setHotels(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load hotels", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      const haystack = [
        hotel.name,
        hotel.address || "",
        hotel.tagline || "",
        hotel.property_type || "",
        ...(hotel.room_type_labels || []),
        ...(hotel.featured_amenities || []),
      ].join(" ").toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesAvailability = !availableOnly || Number(hotel.available_rooms || 0) > 0;
      return matchesQuery && matchesAvailability;
    });
  }, [availableOnly, hotels, query]);

  const updateQuery = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("query", value);
    else next.delete("query");
    setSearchParams(next);
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* ── Hero Banner ── */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f1117 0%, #1a1f2e 50%, #0f1117 100%)",
          borderRadius: "24px",
          padding: "60px 48px",
          marginBottom: "32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative orb */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            right: "-80px",
            width: "320px",
            height: "320px",
            background: "radial-gradient(circle, rgba(201,169,110,0.15) 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-60px",
            left: "20%",
            width: "240px",
            height: "240px",
            background: "radial-gradient(circle, rgba(46,125,103,0.12) 0%, transparent 70%)",
            borderRadius: "50%",
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(201,169,110,0.15)",
            border: "1px solid rgba(201,169,110,0.3)",
            borderRadius: "100px",
            padding: "6px 16px",
            marginBottom: "20px",
          }}
        >
          <Hotel style={{ width: "14px", height: "14px", color: "#c9a96e" }} />
          <span
            style={{
              fontSize: "11px",
              fontWeight: "600",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#c9a96e",
            }}
          >
            Hotels &amp; Stays
          </span>
        </div>

        <h1
          className="font-display"
          style={{ fontSize: "clamp(40px, 5vw, 68px)", color: "#ffffff", lineHeight: 1.05, margin: "0 0 16px" }}
        >
          Find your perfect stay
        </h1>
        <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.55)", lineHeight: 1.8, maxWidth: "520px", margin: "0 0 40px" }}>
          Handpicked hotels with real-time availability, room-level detail, and instant booking — all in one place.
        </p>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>
          {[
            { label: "Dates", value: formatDateRange(checkIn, checkOut) || "Any dates" },
            { label: "Guests", value: `${guests} traveller${guests !== 1 ? "s" : ""}` },
            { label: "Properties", value: `${filteredHotels.length} available` },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "14px",
                padding: "12px 20px",
                minWidth: "130px",
              }}
            >
              <p style={{ fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(255,255,255,0.4)", marginBottom: "6px" }}>
                {label}
              </p>
              <p style={{ fontSize: "14px", fontWeight: "600", color: "#ffffff" }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Search & Filter Bar ── */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "32px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <label
          style={{
            flex: "1 1 280px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "#ffffff",
            border: "1.5px solid rgba(15,17,23,0.1)",
            borderRadius: "14px",
            padding: "0 16px",
            height: "50px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <Search style={{ width: "16px", height: "16px", color: "#9ca3af", flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => updateQuery(e.target.value)}
            placeholder="Search by name, location, or room type…"
            style={{ flex: 1, border: "none", outline: "none", fontSize: "14px", color: "#111827", background: "transparent" }}
          />
        </label>

        {(checkIn || checkOut) && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "#ffffff",
              border: "1.5px solid rgba(15,17,23,0.1)",
              borderRadius: "14px",
              padding: "0 16px",
              height: "50px",
              fontSize: "13px",
              color: "#374151",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              whiteSpace: "nowrap",
            }}
          >
            <CalendarDays style={{ width: "15px", height: "15px", color: "#6b7280" }} />
            {formatDateRange(checkIn, checkOut)}
          </div>
        )}

        <button
          type="button"
          onClick={() => setAvailableOnly((v) => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            height: "50px",
            padding: "0 20px",
            borderRadius: "14px",
            border: availableOnly ? "1.5px solid #2e7d67" : "1.5px solid rgba(15,17,23,0.1)",
            background: availableOnly ? "#2e7d67" : "#ffffff",
            color: availableOnly ? "#ffffff" : "#374151",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            transition: "all 0.2s ease",
            whiteSpace: "nowrap",
          }}
        >
          <SlidersHorizontal style={{ width: "14px", height: "14px" }} />
          {availableOnly ? "Available only ✓" : "Available rooms only"}
        </button>
      </div>

      {/* ── Hotel Grid ── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              style={{
                height: "360px",
                borderRadius: "20px",
                background: "linear-gradient(135deg, #f3f4f6, #e5e7eb)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      ) : filteredHotels.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 40px",
            background: "#ffffff",
            borderRadius: "20px",
            border: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "#f0fdf9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
            }}
          >
            <BedDouble style={{ width: "28px", height: "28px", color: "#2e7d67" }} />
          </div>
          <h2 className="font-display" style={{ fontSize: "36px", color: "#111827", marginBottom: "12px" }}>
            No hotels found
          </h2>
          <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.7, maxWidth: "360px", margin: "0 auto" }}>
            Try a different location, room type, or amenity — or remove the availability filter to see all properties.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
          {filteredHotels.map((hotel) => (
            <HotelCard
              key={hotel.id}
              hotel={hotel}
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const HotelCard = ({ hotel, checkIn, checkOut, guests }) => {
  const [hovered, setHovered] = useState(false);
  const hasImage = !!(hotel.cover_image || hotel.logo);
  const isAvailable = Number(hotel.available_rooms || 0) > 0;

  return (
    <Link
      to={`/hotels/${hotel.slug}?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&guests=${guests}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "block",
        borderRadius: "20px",
        overflow: "hidden",
        background: "#ffffff",
        border: "1px solid rgba(0,0,0,0.07)",
        boxShadow: hovered
          ? "0 24px 56px rgba(0,0,0,0.14)"
          : "0 4px 16px rgba(0,0,0,0.06)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "all 0.28s cubic-bezier(0.4,0,0.2,1)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {/* Image */}
      <div
        style={{
          position: "relative",
          height: "220px",
          background: "linear-gradient(135deg, #1a1f2e 0%, #0f1117 100%)",
          overflow: "hidden",
        }}
      >
        {hasImage ? (
          <img
            src={hotel.cover_image || hotel.logo}
            alt={hotel.name}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: hovered ? "scale(1.06)" : "scale(1)",
              transition: "transform 0.5s ease",
            }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Hotel style={{ width: "48px", height: "48px", color: "rgba(255,255,255,0.2)" }} />
          </div>
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6) 100%)",
          }}
        />

        {/* Badges */}
        <div
          style={{
            position: "absolute",
            top: "14px",
            left: "14px",
            display: "flex",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              background: isAvailable ? "rgba(46,125,103,0.95)" : "rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
              color: "#ffffff",
              fontSize: "10px",
              fontWeight: "700",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "5px 10px",
              borderRadius: "100px",
            }}
          >
            {isAvailable ? `${hotel.available_rooms} rooms open` : "Fully booked"}
          </span>
        </div>

        {hotel.property_type && (
          <span
            style={{
              position: "absolute",
              bottom: "14px",
              left: "14px",
              background: "rgba(255,255,255,0.15)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255,255,255,0.2)",
              color: "#ffffff",
              fontSize: "10px",
              fontWeight: "600",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "5px 10px",
              borderRadius: "100px",
            }}
          >
            {hotel.property_type}
          </span>
        )}
      </div>

      {/* Body */}
      <div style={{ padding: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "8px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              className="font-display"
              style={{
                fontSize: "22px",
                color: "#111827",
                lineHeight: 1.2,
                margin: "0 0 4px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {hotel.name}
            </h2>
            {hotel.tagline && (
              <p style={{ fontSize: "12px", color: "#c9a96e", fontWeight: "600", margin: "0 0 4px" }}>
                {hotel.tagline}
              </p>
            )}
            <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>{formatAddress(hotel.address)}</p>
          </div>
          <div
            style={{
              background: "#f0fdf9",
              borderRadius: "12px",
              padding: "8px 12px",
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            <p style={{ fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#2e7d67", marginBottom: "2px" }}>From</p>
            <p style={{ fontSize: "14px", fontWeight: "700", color: "#111827" }}>
              {hotel.starting_price ? formatCurrency(hotel.starting_price) : "—"}
            </p>
          </div>
        </div>

        {/* Meta row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            margin: "14px 0",
            padding: "12px",
            background: "#f9fafb",
            borderRadius: "12px",
          }}
        >
          <div>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#9ca3af", marginBottom: "3px" }}>
              Total rooms
            </p>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "#111827" }}>{hotel.total_rooms || 0}</p>
          </div>
          <div>
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#9ca3af", marginBottom: "3px" }}>
              Guests
            </p>
            <p style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", fontWeight: "600", color: "#111827" }}>
              <Users style={{ width: "12px", height: "12px" }} />
              {guests}
            </p>
          </div>
        </div>

        {/* Amenity tags */}
        {((hotel.featured_amenities || []).length > 0 || (hotel.room_type_labels || []).length > 0) && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {(hotel.featured_amenities || []).slice(0, 2).map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: "11px",
                  fontWeight: "500",
                  color: "#2e7d67",
                  background: "#f0fdf9",
                  border: "1px solid rgba(46,125,103,0.18)",
                  borderRadius: "100px",
                  padding: "3px 10px",
                }}
              >
                {tag}
              </span>
            ))}
            {(hotel.room_type_labels || []).slice(0, 2).map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: "11px",
                  fontWeight: "500",
                  color: "#6b5842",
                  background: "#fdf5ec",
                  border: "1px solid rgba(107,88,66,0.15)",
                  borderRadius: "100px",
                  padding: "3px 10px",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
};

export default HotelsPage;
