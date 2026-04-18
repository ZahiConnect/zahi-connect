import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Globe,
  Hotel,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import { loadRazorpayScript } from "../lib/razorpay";
import {
  buildWhatsAppLink,
  formatAddress,
  formatCurrency,
  formatDateRange,
  todayDate,
} from "../lib/format";
import bookingService from "../services/bookingService";
import marketplaceService from "../services/marketplaceService";

/* ── helpers ────────────────────────────────────────────── */

const tomorrowDate = () => {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return next.toISOString().slice(0, 10);
};

const clampGuests = (value) => Math.min(8, Math.max(1, Number(value) || 1));

const calculateNights = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 1;
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((end - start) / 86400000));
};

const uniqueValues = (values = []) =>
  values.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

const normalizeRoomMode = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "Standard";
  const compact = raw.toLowerCase().replace(/[\s_-]+/g, "");
  if (compact === "ac") return "AC";
  if (compact === "nonac") return "Non AC";
  return raw;
};

const roomNumberSortKey = (value) => {
  const roomValue = String(value || "");
  const digits = roomValue.replace(/\D/g, "");
  return {
    numeric: digits ? Number(digits) : Number.MAX_SAFE_INTEGER,
    label: roomValue,
  };
};

const sortRooms = (rooms = []) =>
  [...rooms].sort((l, r) => {
    if (Boolean(l?.is_available) !== Boolean(r?.is_available))
      return l?.is_available ? -1 : 1;
    const lk = roomNumberSortKey(l?.room_number);
    const rk = roomNumberSortKey(r?.room_number);
    if (lk.numeric !== rk.numeric) return lk.numeric - rk.numeric;
    return lk.label.localeCompare(rk.label, undefined, { numeric: true });
  });

const getRoomModePrice = (roomType, roomMode, hotelStartingPrice) => {
  if (!roomType) return hotelStartingPrice ?? null;
  const normalizedMode = normalizeRoomMode(roomMode);
  if (normalizedMode === "AC" && roomType.ac_price != null) return roomType.ac_price;
  if (normalizedMode === "Non AC" && roomType.non_ac_price != null) return roomType.non_ac_price;
  if (roomType.starting_price != null) return roomType.starting_price;
  if (roomType.ac_price != null) return roomType.ac_price;
  if (roomType.non_ac_price != null) return roomType.non_ac_price;
  return hotelStartingPrice ?? null;
};

/**
 * Only images directly belonging to the room itself or its room-type.
 * We deliberately DO NOT fall back to hotel-level gallery images so that
 * each room card only shows its own photos.
 */
const buildRoomGallery = (room, roomType) =>
  uniqueValues([
    ...(room?.image_urls || []),
    room?.image_url,
    ...(roomType?.image_urls || []),
    roomType?.image_url,
  ]);

const buildDirectRoomImages = (room) =>
  uniqueValues([...(room?.image_urls || []), room?.image_url]);

const getRoomDescription = (room, roomType, hotel) =>
  room?.notes ||
  roomType?.description ||
  hotel?.summary?.description ||
  hotel?.settings?.description ||
  "A comfortable, well-appointed room ready for a memorable stay. Contact the hotel for more details.";

/* ── status badge style ─────────────────────────────────── */
const statusStyle = (status, isAvailable) => {
  if (isAvailable) return { bg: "#ecfdf5", color: "#047857" };
  const s = String(status || "").toLowerCase();
  if (s === "maintenance") return { bg: "#fef2f2", color: "#b91c1c" };
  if (s === "cleaning") return { bg: "#fefce8", color: "#92400e" };
  return { bg: "#fff7ed", color: "#c2410c" };
};

/* ── InfoChip helper ───────────────────────────────────── */
const Chip = ({ children, style = {} }) => (
  <span
    style={{
      fontSize: "10px",
      fontWeight: "700",
      letterSpacing: "0.12em",
      textTransform: "uppercase",
      padding: "4px 10px",
      borderRadius: "100px",
      ...style,
    }}
  >
    {children}
  </span>
);

/* ── StatBox ───────────────────────────────────────────── */
const StatBox = ({ label, value }) => (
  <div
    style={{
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: "14px",
      padding: "14px 16px",
    }}
  >
    <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)", marginBottom: "6px" }}>
      {label}
    </p>
    <p style={{ fontSize: "15px", fontWeight: "600", color: "#ffffff" }}>{value}</p>
  </div>
);

/* ── FormField ─────────────────────────────────────────── */
const FormField = ({ label, icon: Icon, children }) => (
  <label style={{ display: "block" }}>
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "12px",
        fontWeight: "600",
        color: "#374151",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: "8px",
      }}
    >
      {Icon && <Icon style={{ width: "13px", height: "13px" }} />}
      {label}
    </span>
    {children}
  </label>
);

const inputStyle = {
  width: "100%",
  borderRadius: "12px",
  border: "1px solid rgba(0,0,0,0.12)",
  background: "#f9fafb",
  padding: "10px 14px",
  fontSize: "14px",
  outline: "none",
  color: "#111827",
  boxSizing: "border-box",
};

/* ════════════════════════════════════════════════════════ */
/*  Main component                                          */
/* ════════════════════════════════════════════════════════ */

const HotelDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payingNow, setPayingNow] = useState(false);
  const [selectedRoomNumber, setSelectedRoomNumber] = useState("");
  const [activeHeroImageIndex, setActiveHeroImageIndex] = useState(0);
  const [activeRoomImageIndex, setActiveRoomImageIndex] = useState(0);
  const [specialRequest, setSpecialRequest] = useState("");
  const [guestProfile, setGuestProfile] = useState({ guestName: "", phone: "" });
  const [stay, setStay] = useState({
    checkIn: searchParams.get("checkIn") || todayDate(),
    checkOut: searchParams.get("checkOut") || tomorrowDate(),
    guests: clampGuests(searchParams.get("guests") || "2"),
  });

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await marketplaceService.getHotel(slug);
        if (active) setHotel(data);
      } catch (error) {
        console.error("Failed to load hotel detail", error);
        if (active) setHotel(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    setGuestProfile((c) => ({
      guestName: c.guestName || user?.username || "",
      phone: c.phone || user?.mobile || "",
    }));
  }, [user?.mobile, user?.username]);

  const hotelName =
    hotel?.summary?.display_name ||
    hotel?.summary?.name ||
    hotel?.settings?.display_name ||
    hotel?.tenant?.name ||
    "this hotel";

  const propertyImages = useMemo(
    () =>
      uniqueValues([
        hotel?.summary?.cover_image,
        ...(hotel?.summary?.gallery_image_urls || []),
        ...(hotel?.settings?.gallery_image_urls || []),
        hotel?.summary?.logo,
      ]),
    [hotel]
  );

  const currentHeroImage =
    propertyImages[activeHeroImageIndex] ||
    hotel?.summary?.cover_image ||
    hotel?.settings?.cover_image ||
    hotel?.summary?.logo ||
    null;

  const sortedRooms = useMemo(() => sortRooms(hotel?.rooms || []), [hotel?.rooms]);
  const roomTypeMap = useMemo(
    () => Object.fromEntries((hotel?.room_types || []).map((rt) => [rt.name, rt])),
    [hotel?.room_types]
  );

  const defaultRoom = useMemo(
    () =>
      sortedRooms.find((r) => r.is_available && (r.image_urls?.length || r.image_url)) ||
      sortedRooms.find((r) => r.is_available) ||
      sortedRooms[0] ||
      null,
    [sortedRooms]
  );

  useEffect(() => {
    setSelectedRoomNumber(defaultRoom?.room_number || "");
    setActiveHeroImageIndex(0);
    setActiveRoomImageIndex(0);
    setSpecialRequest("");
  }, [defaultRoom?.room_number, slug]);

  const selectedRoom = useMemo(
    () => sortedRooms.find((r) => String(r.room_number) === String(selectedRoomNumber)) || defaultRoom,
    [defaultRoom, selectedRoomNumber, sortedRooms]
  );

  const selectedRoomType = selectedRoom ? roomTypeMap[selectedRoom.type] || null : null;
  const selectedRoomMode = normalizeRoomMode(selectedRoom?.mode);

  /* ── IMAGE FIX: only room-specific images, no hotel gallery fallback ── */
  const selectedRoomImages = useMemo(
    () => buildRoomGallery(selectedRoom, selectedRoomType),
    [selectedRoom, selectedRoomType]
  );
  const currentRoomImage = selectedRoomImages[activeRoomImageIndex] || null;

  const selectedRoomDescription = getRoomDescription(selectedRoom, selectedRoomType, hotel);
  const roomNights = useMemo(() => calculateNights(stay.checkIn, stay.checkOut), [stay.checkIn, stay.checkOut]);
  const selectedRoomPrice = useMemo(
    () => getRoomModePrice(selectedRoomType, selectedRoomMode, hotel?.summary?.starting_price),
    [hotel?.summary?.starting_price, selectedRoomMode, selectedRoomType]
  );
  const stayTotal = useMemo(
    () => (selectedRoomPrice != null ? Number((selectedRoomPrice * roomNights).toFixed(2)) : null),
    [roomNights, selectedRoomPrice]
  );
  const hotelWebsiteHref = useMemo(() => {
    const w = String(hotel?.settings?.website || "").trim();
    if (!w) return "";
    return w.startsWith("http://") || w.startsWith("https://") ? w : `https://${w}`;
  }, [hotel?.settings?.website]);
  const roomAvailabilityCount = useMemo(
    () => sortedRooms.filter((r) => r.type === selectedRoom?.type && r.is_available).length,
    [selectedRoom?.type, sortedRooms]
  );

  useEffect(() => {
    if (!propertyImages.length) { setActiveHeroImageIndex(0); return; }
    setActiveHeroImageIndex((c) => (c >= propertyImages.length ? 0 : c));
  }, [propertyImages.length]);

  useEffect(() => {
    if (!selectedRoomImages.length) { setActiveRoomImageIndex(0); return; }
    setActiveRoomImageIndex((c) => (c >= selectedRoomImages.length ? 0 : c));
  }, [selectedRoomImages.length, selectedRoom?.room_number]);

  const browseHeroImages = (dir) => {
    if (!propertyImages.length) return;
    setActiveHeroImageIndex((c) => (c + dir + propertyImages.length) % propertyImages.length);
  };
  const browseRoomImages = (dir) => {
    if (!selectedRoomImages.length) return;
    setActiveRoomImageIndex((c) => (c + dir + selectedRoomImages.length) % selectedRoomImages.length);
  };

  const whatsappMessage = useMemo(() => {
    if (!hotel || !selectedRoom) return "";
    return [
      `Hi Zahi, I want to book ${hotelName}.`,
      `Room: ${selectedRoom.room_number}`,
      `Type: ${selectedRoom.type}`,
      `Check-in: ${stay.checkIn}`,
      `Check-out: ${stay.checkOut}`,
      `Guests: ${stay.guests}`,
      specialRequest ? `Notes: ${specialRequest}` : null,
    ].filter(Boolean).join("\n");
  }, [hotel, hotelName, selectedRoom, specialRequest, stay.checkIn, stay.checkOut, stay.guests]);

  const startInstantBooking = async () => {
    if (!hotel || !selectedRoom) { toast.error("Choose a room before continuing."); return; }
    if (!selectedRoom.is_available) { toast.error("Choose an available room to continue."); return; }
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    if (!guestProfile.guestName.trim() || !guestProfile.phone.trim()) {
      toast.error("Add the lead guest name and phone number before booking.");
      return;
    }
    if (!stay.checkIn || !stay.checkOut || new Date(stay.checkIn) >= new Date(stay.checkOut)) {
      toast.error("Choose a valid check-in and check-out date.");
      return;
    }
    if (stayTotal == null || stayTotal <= 0) { toast.error("This room is missing a valid public price."); return; }

    setPayingNow(true);
    try {
      const bookingPayload = {
        service_type: "hotel",
        title: `Confirmed room ${selectedRoom.room_number} at ${hotelName}`,
        summary: `Room ${selectedRoom.room_number}, ${selectedRoom.type}, ${roomNights} night(s), ${stay.guests} guest(s)`,
        tenant_id: hotel.tenant?.id || null,
        tenant_slug: hotel.tenant?.slug || null,
        tenant_name: hotelName || null,
        total_amount: stayTotal,
        metadata: {
          booking_kind: "confirmed_reservation",
          check_in: stay.checkIn,
          check_out: stay.checkOut,
          guests: stay.guests,
          nights: roomNights,
          guest_name: guestProfile.guestName.trim(),
          guest_phone: guestProfile.phone.trim(),
          special_requests: specialRequest.trim() || null,
          preferred_room_type: selectedRoom.type,
          room_type: selectedRoom.type,
          room_mode: selectedRoomMode,
          nightly_rate: selectedRoomPrice,
          room_total_amount: stayTotal,
          room_type_description: selectedRoomType?.description || null,
          room_type_image: selectedRoomType?.image_url || null,
          room_type_images: selectedRoomType?.image_urls || [],
          selected_room_id: selectedRoom.id || null,
          selected_room_number: selectedRoom.room_number,
          selected_room_floor: selectedRoom.floor || null,
          selected_room_mode: selectedRoomMode,
          selected_room_status: selectedRoom.status || null,
          selected_room_notes: selectedRoom.notes || null,
          selected_room_image: selectedRoom.image_url || null,
          selected_room_images: buildDirectRoomImages(selectedRoom),
          selected_room_is_available: Boolean(selectedRoom.is_available),
          selected_room_description: selectedRoomDescription || null,
          hotel_address: hotel.settings?.address || null,
          check_in_time: hotel.settings?.check_in_time || "14:00",
          check_out_time: hotel.settings?.check_out_time || "11:00",
        },
      };

      const checkoutData = await bookingService.createPaymentCheckout(bookingPayload);
      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded || !window.Razorpay) throw new Error("Razorpay checkout could not be loaded.");

      const razorpay = new window.Razorpay({
        ...checkoutData.checkout,
        theme: { color: "#2e7d67" },
        handler: async (result) => {
          try {
            await bookingService.verifyPayment({
              payment_order_id: checkoutData.payment_order_id,
              razorpay_order_id: result.razorpay_order_id,
              razorpay_payment_id: result.razorpay_payment_id,
              razorpay_signature: result.razorpay_signature,
            });
            toast.success("Payment captured and your booking is confirmed.");
            navigate("/account");
          } catch (err) {
            console.error("Hotel payment verification failed", err);
            toast.error(err.response?.data?.detail || "Payment was received, but the booking confirmation failed.");
            setPayingNow(false);
          }
        },
        modal: { ondismiss: () => setPayingNow(false) },
      });
      razorpay.open();
    } catch (error) {
      console.error("Failed to start hotel payment", error);
      toast.error(error.response?.data?.detail || error.message || "Could not start the payment right now.");
      setPayingNow(false);
    }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px" }}>
        <div style={{ height: "520px", borderRadius: "20px", background: "linear-gradient(135deg,#f3f4f6,#e5e7eb)", animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ height: "520px", borderRadius: "20px", background: "linear-gradient(135deg,#f3f4f6,#e5e7eb)", animation: "pulse 1.5s ease-in-out infinite" }} />
      </div>
    );
  }

  /* ── Not found ── */
  if (!hotel) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "80px 40px",
          background: "#ffffff",
          borderRadius: "20px",
          border: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "#f0fdf9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <Hotel style={{ width: "28px", height: "28px", color: "#2e7d67" }} />
        </div>
        <h1 className="font-display" style={{ fontSize: "40px", color: "#111827", marginBottom: "12px" }}>
          Property unavailable
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", lineHeight: 1.7, maxWidth: "360px", margin: "0 auto 28px" }}>
          We couldn&apos;t find this property. It may have moved or is temporarily unlisted.
        </p>
        <Link
          to="/hotels"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background: "#111827",
            color: "#ffffff",
            borderRadius: "12px",
            padding: "12px 24px",
            fontSize: "14px",
            fontWeight: "600",
            textDecoration: "none",
          }}
        >
          <ArrowLeft style={{ width: "16px", height: "16px" }} />
          Explore all hotels
        </Link>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════════ */
  /*  Main layout                                             */
  /* ════════════════════════════════════════════════════════ */
  const ss = selectedRoom ? statusStyle(selectedRoom.status, selectedRoom.is_available) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Back link */}
      <Link
        to="/hotels"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          fontSize: "13px",
          fontWeight: "600",
          color: "#2e7d67",
          textDecoration: "none",
        }}
      >
        <ArrowLeft style={{ width: "15px", height: "15px" }} />
        All hotels
      </Link>

      {/* ── Hero panel ── */}
      <section
        style={{
          background: "linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)",
          borderRadius: "24px",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          minHeight: "440px",
          position: "relative",
        }}
        className="hotel-hero-grid"
      >
        {/* Left: image carousel */}
        <div style={{ position: "relative", overflow: "hidden" }}>
          {currentHeroImage ? (
            <img
              src={currentHeroImage}
              alt={hotelName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "320px",
              }}
            >
              <Hotel style={{ width: "60px", height: "60px", color: "rgba(255,255,255,0.15)" }} />
            </div>
          )}
          {/* Dark gradient right-side overlay */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, transparent 60%, rgba(15,17,23,0.85) 100%)" }} />

          {/* Available badge */}
          <div style={{ position: "absolute", top: "20px", left: "20px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <Chip style={{ background: "rgba(46,125,103,0.9)", color: "#ffffff", backdropFilter: "blur(8px)" }}>
              {hotel.summary?.available_rooms || 0} rooms available
            </Chip>
            {hotel.summary?.property_type && (
              <Chip style={{ background: "rgba(255,255,255,0.12)", color: "#ffffff", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.2)" }}>
                {hotel.summary.property_type}
              </Chip>
            )}
          </div>

          {/* Hero image nav */}
          {propertyImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => browseHeroImages(-1)}
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.9)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                }}
                aria-label="Previous image"
              >
                <ChevronLeft style={{ width: "18px", height: "18px" }} />
              </button>
              <button
                type="button"
                onClick={() => browseHeroImages(1)}
                style={{
                  position: "absolute",
                  right: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.9)",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
                }}
                aria-label="Next image"
              >
                <ChevronRight style={{ width: "18px", height: "18px" }} />
              </button>

              {/* Thumbnail strip */}
              <div style={{ position: "absolute", bottom: "12px", left: "50%", transform: "translateX(-50%)", display: "flex", gap: "6px" }}>
                {propertyImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveHeroImageIndex(idx)}
                    style={{
                      width: idx === activeHeroImageIndex ? "24px" : "8px",
                      height: "8px",
                      borderRadius: "100px",
                      background: idx === activeHeroImageIndex ? "#ffffff" : "rgba(255,255,255,0.4)",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      transition: "all 0.25s ease",
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: hotel info */}
        <div style={{ padding: "40px 40px 40px 48px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(201,169,110,0.15)",
                border: "1px solid rgba(201,169,110,0.3)",
                borderRadius: "100px",
                padding: "5px 14px",
                marginBottom: "16px",
              }}
            >
              <span style={{ fontSize: "10px", fontWeight: "700", letterSpacing: "0.16em", textTransform: "uppercase", color: "#c9a96e" }}>
                Hotels &amp; Stays
              </span>
            </div>

            <h1
              className="font-display"
              style={{ fontSize: "clamp(32px, 4vw, 54px)", color: "#ffffff", lineHeight: 1.05, margin: "0 0 12px" }}
            >
              {hotelName}
            </h1>

            {hotel.summary?.tagline && (
              <p style={{ fontSize: "14px", color: "#c9a96e", fontWeight: "500", marginBottom: "10px" }}>
                {hotel.summary.tagline}
              </p>
            )}

            <p style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "rgba(255,255,255,0.55)", marginBottom: "28px" }}>
              <MapPin style={{ width: "14px", height: "14px", color: "#c9a96e", flexShrink: 0 }} />
              {formatAddress(hotel.settings?.address)}
            </p>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <StatBox label="Starting from" value={hotel.summary?.starting_price ? formatCurrency(hotel.summary.starting_price) : "—"} />
              <StatBox label="Check-in / out" value={`${hotel.settings?.check_in_time || "14:00"} / ${hotel.settings?.check_out_time || "11:00"}`} />
              <StatBox label="Total rooms" value={`${hotel.summary?.total_rooms || 0}`} />
              <StatBox label="Room types" value={`${hotel.summary?.room_type_count || 0} categories`} />
            </div>
          </div>

          {/* Amenity tags */}
          {(hotel.summary?.featured_amenities || []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "24px" }}>
              {(hotel.summary.featured_amenities).slice(0, 6).map((a) => (
                <span
                  key={a}
                  style={{
                    fontSize: "11px",
                    fontWeight: "500",
                    color: "rgba(255,255,255,0.7)",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "100px",
                    padding: "4px 12px",
                  }}
                >
                  {a}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Contact quick row ── */}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }} className="contact-grid">
        {[
          {
            href: hotel.settings?.map_link || "#",
            icon: MapPin,
            label: "Location",
            value: "Open in maps",
            external: !!hotel.settings?.map_link,
          },
          {
            href: hotelWebsiteHref || "#",
            icon: Globe,
            label: "Website",
            value: "Visit hotel site",
            external: !!hotelWebsiteHref,
          },
          {
            href: hotel.settings?.phone ? `tel:${hotel.settings.phone}` : "#",
            icon: Phone,
            label: "Phone",
            value: hotel.settings?.phone || hotel.tenant?.phone || "—",
            external: false,
          },
          {
            href: hotel.settings?.email ? `mailto:${hotel.settings.email}` : "#",
            icon: Mail,
            label: "Email",
            value: hotel.settings?.email || hotel.tenant?.email || "—",
            external: false,
          },
        ].map(({ href, icon: Icon, label, value, external }) => (
          <a
            key={label}
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer" : undefined}
            style={{
              display: "block",
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.07)",
              borderRadius: "16px",
              padding: "16px",
              textDecoration: "none",
              transition: "box-shadow 0.2s ease, transform 0.2s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <Icon style={{ width: "16px", height: "16px", color: "#2e7d67" }} />
              <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.16em", color: "#9ca3af", fontWeight: "600" }}>
                {label}
              </span>
            </div>
            <p style={{ fontSize: "13px", fontWeight: "600", color: "#111827", margin: 0 }}>{value}</p>
          </a>
        ))}
      </section>

      {/* ── Main content: rooms + booking sidebar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "24px", alignItems: "start" }} className="rooms-grid">

        {/* ── Left: Room browser ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          {/* Section header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.2em", color: "#2e7d67", fontWeight: "700", marginBottom: "4px" }}>
                Available Rooms
              </p>
              <h2 className="font-display" style={{ fontSize: "32px", color: "#111827", margin: 0 }}>
                Select your room
              </h2>
            </div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "700",
                color: "#2e7d67",
                background: "#f0fdf9",
                border: "1px solid rgba(46,125,103,0.2)",
                borderRadius: "100px",
                padding: "6px 14px",
              }}
            >
              {sortedRooms.length} rooms
            </span>
          </div>

          {/* Room grid */}
          {sortedRooms.length ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: "12px",
                maxHeight: "600px",
                overflowY: "auto",
                paddingRight: "4px",
              }}
            >
              {sortedRooms.map((room) => {
                const isSelected = String(selectedRoom?.room_number) === String(room.room_number);
                const directImages = buildDirectRoomImages(room);
                const roomTypeImages = uniqueValues([
                  ...(roomTypeMap[room.type]?.image_urls || []),
                  roomTypeMap[room.type]?.image_url,
                ]);
                /* ── IMAGE FIX: only show room's own images, or room-type images */
                const previewImage = directImages[0] || roomTypeImages[0] || null;
                const { bg: sBg, color: sColor } = statusStyle(room.status, room.is_available);

                return (
                  <button
                    key={room.id || room.room_number}
                    type="button"
                    onClick={() => setSelectedRoomNumber(room.room_number)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      textAlign: "left",
                      border: isSelected ? "2px solid #111827" : "1px solid rgba(0,0,0,0.08)",
                      borderRadius: "16px",
                      overflow: "hidden",
                      background: isSelected ? "#111827" : "#ffffff",
                      cursor: "pointer",
                      transition: "all 0.22s ease",
                      boxShadow: isSelected ? "0 16px 40px rgba(0,0,0,0.18)" : "0 2px 8px rgba(0,0,0,0.05)",
                      transform: isSelected ? "scale(1.01)" : "scale(1)",
                    }}
                  >
                    {/* Room image */}
                    <div
                      style={{
                        height: "120px",
                        background: previewImage
                          ? "transparent"
                          : isSelected
                          ? "rgba(255,255,255,0.08)"
                          : "#f3f4f6",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      {previewImage ? (
                        <img
                          src={previewImage}
                          alt={`Room ${room.room_number}`}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                          <BedDouble style={{ width: "32px", height: "32px", color: isSelected ? "rgba(255,255,255,0.25)" : "#d1d5db" }} />
                        </div>
                      )}

                      {/* Room number badge */}
                      <span
                        style={{
                          position: "absolute",
                          top: "8px",
                          left: "8px",
                          background: "rgba(255,255,255,0.92)",
                          color: "#111827",
                          fontSize: "10px",
                          fontWeight: "700",
                          letterSpacing: "0.12em",
                          textTransform: "uppercase",
                          padding: "3px 8px",
                          borderRadius: "100px",
                        }}
                      >
                        #{room.room_number}
                      </span>
                    </div>

                    {/* Room info */}
                    <div style={{ padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                        <p style={{ fontSize: "13px", fontWeight: "700", color: isSelected ? "#ffffff" : "#111827", margin: 0 }}>
                          {room.type}
                        </p>
                        <span
                          style={{
                            fontSize: "9px",
                            fontWeight: "700",
                            textTransform: "uppercase",
                            letterSpacing: "0.1em",
                            padding: "2px 7px",
                            borderRadius: "100px",
                            background: sBg,
                            color: sColor,
                            flexShrink: 0,
                          }}
                        >
                          {room.status}
                        </span>
                      </div>
                      <p style={{ fontSize: "11px", color: isSelected ? "rgba(255,255,255,0.5)" : "#6b7280", margin: 0 }}>
                        Floor {room.floor || "G"} · {normalizeRoomMode(room.mode)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                padding: "48px 32px",
                textAlign: "center",
                background: "#f9fafb",
                borderRadius: "16px",
                border: "2px dashed rgba(0,0,0,0.08)",
                fontSize: "14px",
                color: "#6b7280",
              }}
            >
              Rooms will appear here once the property team publishes availability.
            </div>
          )}

          {/* ── Selected room detail panel ── */}
          {selectedRoom ? (
            <div
              style={{
                background: "#ffffff",
                border: "1px solid rgba(0,0,0,0.07)",
                borderRadius: "20px",
                overflow: "hidden",
              }}
            >
              {/* Room image viewer */}
              <div style={{ position: "relative", height: "320px", background: "#f3f4f6" }}>
                {currentRoomImage ? (
                  <img
                    src={currentRoomImage}
                    alt={`Room ${selectedRoom.room_number}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  /* ── IMAGE FIX: no fallback to hotel images — show proper empty state ── */
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      height: "100%",
                      gap: "12px",
                    }}
                  >
                    <BedDouble style={{ width: "48px", height: "48px", color: "#d1d5db" }} />
                    <p style={{ fontSize: "13px", color: "#9ca3af", margin: 0 }}>No photos for this room yet</p>
                  </div>
                )}

                {selectedRoomImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => browseRoomImages(-1)}
                      style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      aria-label="Previous room image"
                    >
                      <ChevronLeft style={{ width: "16px", height: "16px" }} />
                    </button>
                    <button
                      type="button"
                      onClick={() => browseRoomImages(1)}
                      style={{ position: "absolute", right: "14px", top: "50%", transform: "translateY(-50%)", width: "36px", height: "36px", borderRadius: "50%", background: "rgba(255,255,255,0.9)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      aria-label="Next room image"
                    >
                      <ChevronRight style={{ width: "16px", height: "16px" }} />
                    </button>
                  </>
                )}

                {/* Bottom overlay */}
                {currentRoomImage && (
                  <div style={{ position: "absolute", bottom: 0, insetInline: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", padding: "24px 20px 16px", display: "flex", gap: "8px" }}>
                    <Chip style={{ background: "rgba(255,255,255,0.9)", color: "#111827" }}>{selectedRoom.type}</Chip>
                    <Chip style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.2)" }}>{selectedRoomMode}</Chip>
                    <Chip style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,0.2)" }}>Floor {selectedRoom.floor || "G"}</Chip>
                  </div>
                )}
              </div>

              {/* Thumbnail strip */}
              {selectedRoomImages.length > 1 && (
                <div style={{ display: "flex", gap: "8px", overflowX: "auto", padding: "12px 16px", background: "#f9fafb" }}>
                  {selectedRoomImages.map((url, idx) => (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => setActiveRoomImageIndex(idx)}
                      style={{
                        flexShrink: 0,
                        width: "72px",
                        height: "54px",
                        borderRadius: "10px",
                        overflow: "hidden",
                        border: idx === activeRoomImageIndex ? "2px solid #111827" : "2px solid transparent",
                        cursor: "pointer",
                        padding: 0,
                        opacity: idx === activeRoomImageIndex ? 1 : 0.65,
                        transition: "all 0.2s ease",
                      }}
                    >
                      <img src={url} alt={`Room ${selectedRoom.room_number} view ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </button>
                  ))}
                </div>
              )}

              {/* Room details */}
              <div style={{ padding: "24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <h3 style={{ fontSize: "22px", fontWeight: "700", color: "#111827", marginBottom: "4px" }}>
                    Room {selectedRoom.room_number}
                  </h3>
                  <p style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#6b7280", marginBottom: "12px" }}>
                    {selectedRoom.type} · {selectedRoomMode}
                  </p>
                  <p style={{ fontSize: "13px", lineHeight: 1.7, color: "#4b5563" }}>{selectedRoomDescription}</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", alignContent: "start" }}>
                  {[
                    { label: "Nightly rate", value: selectedRoomPrice != null ? formatCurrency(selectedRoomPrice) : "—" },
                    { label: "Stay total", value: stayTotal != null ? formatCurrency(stayTotal) : "—" },
                    { label: "Availability", value: `${roomAvailabilityCount} of this type` },
                    { label: "Stay length", value: `${roomNights} night${roomNights !== 1 ? "s" : ""}` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{ background: "#f9fafb", borderRadius: "12px", padding: "12px 14px" }}>
                      <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.14em", color: "#9ca3af", marginBottom: "4px" }}>{label}</p>
                      <p style={{ fontSize: "14px", fontWeight: "700", color: "#111827" }}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "240px",
                background: "#f9fafb",
                borderRadius: "20px",
                border: "2px dashed rgba(0,0,0,0.08)",
                fontSize: "14px",
                color: "#6b7280",
              }}
            >
              Select a room from the list above to view photos and details.
            </div>
          )}
        </div>

        {/* ── Right: Booking sidebar ── */}
        <aside style={{ position: "sticky", top: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.07)",
              borderRadius: "20px",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
            }}
          >
            {/* Sidebar header */}
            <div style={{ background: "linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)", padding: "24px" }}>
              <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "rgba(201,169,110,0.8)", marginBottom: "8px" }}>
                Reserve your stay
              </p>
              <h2 className="font-display" style={{ fontSize: "28px", color: "#ffffff", margin: 0 }}>
                {selectedRoom ? `Room ${selectedRoom.room_number}` : "Select a room"}
              </h2>
              {selectedRoom && ss && (
                <span
                  style={{
                    display: "inline-block",
                    marginTop: "8px",
                    fontSize: "10px",
                    fontWeight: "700",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    padding: "4px 10px",
                    borderRadius: "100px",
                    background: ss.bg,
                    color: ss.color,
                  }}
                >
                  {selectedRoom.status}
                </span>
              )}
            </div>

            {/* Selected room mini card */}
            {selectedRoom && (
              <div style={{ padding: "16px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                <div
                  style={{
                    borderRadius: "14px",
                    overflow: "hidden",
                    background: "#f3f4f6",
                    height: "120px",
                    marginBottom: "12px",
                  }}
                >
                  {selectedRoomImages[0] ? (
                    <img
                      src={selectedRoomImages[0]}
                      alt={`Room ${selectedRoom.room_number}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: "8px" }}>
                      <BedDouble style={{ width: "28px", height: "28px", color: "#9ca3af" }} />
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ fontSize: "14px", fontWeight: "700", color: "#111827", marginBottom: "2px" }}>
                      Room {selectedRoom.room_number}
                    </p>
                    <p style={{ fontSize: "12px", color: "#6b7280" }}>{selectedRoom.type} · {selectedRoomMode}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ fontSize: "11px", color: "#9ca3af", marginBottom: "2px" }}>Nightly</p>
                    <p style={{ fontSize: "15px", fontWeight: "700", color: "#111827" }}>
                      {selectedRoomPrice != null ? formatCurrency(selectedRoomPrice) : "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Booking form */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <FormField label="Check-in" icon={CalendarDays}>
                  <input
                    type="date"
                    value={stay.checkIn}
                    onChange={(e) => setStay((c) => ({ ...c, checkIn: e.target.value }))}
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Check-out" icon={Clock3}>
                  <input
                    type="date"
                    value={stay.checkOut}
                    onChange={(e) => setStay((c) => ({ ...c, checkOut: e.target.value }))}
                    style={inputStyle}
                  />
                </FormField>
              </div>

              <FormField label="Guests" icon={Users}>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={stay.guests}
                  onChange={(e) => setStay((c) => ({ ...c, guests: clampGuests(e.target.value) }))}
                  style={inputStyle}
                />
              </FormField>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <FormField label="Lead guest" icon={ShieldCheck}>
                  <input
                    type="text"
                    value={guestProfile.guestName}
                    onChange={(e) => setGuestProfile((c) => ({ ...c, guestName: e.target.value }))}
                    placeholder="Full name"
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Contact" icon={Phone}>
                  <input
                    type="tel"
                    value={guestProfile.phone}
                    onChange={(e) => setGuestProfile((c) => ({ ...c, phone: e.target.value }))}
                    placeholder="Mobile"
                    style={inputStyle}
                  />
                </FormField>
              </div>

              <FormField label="Special request" icon={Mail}>
                <textarea
                  rows="2"
                  value={specialRequest}
                  onChange={(e) => setSpecialRequest(e.target.value)}
                  placeholder="Quiet room, late check-in…"
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </FormField>
            </div>

            {/* Price summary */}
            <div
              style={{
                margin: "0 16px 16px",
                background: "#0f1117",
                borderRadius: "14px",
                padding: "16px",
              }}
            >
              <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.18em", color: "rgba(255,255,255,0.4)", marginBottom: "8px" }}>
                Payment summary
              </p>
              <p style={{ fontSize: "28px", fontWeight: "700", color: "#ffffff", marginBottom: "6px" }}>
                {stayTotal != null ? formatCurrency(stayTotal) : "—"}
              </p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: 0 }}>
                {selectedRoom && selectedRoomPrice != null
                  ? `${formatDateRange(stay.checkIn, stay.checkOut)} · ${roomNights} night${roomNights !== 1 ? "s" : ""}`
                  : "Select a room to see total"}
              </p>
            </div>

            {/* CTA buttons */}
            <div style={{ padding: "0 16px 20px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                type="button"
                onClick={startInstantBooking}
                disabled={payingNow || !selectedRoom || stayTotal == null || !selectedRoom?.is_available}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  background: "#2e7d67",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "14px",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer",
                  opacity: (payingNow || !selectedRoom || stayTotal == null || !selectedRoom?.is_available) ? 0.6 : 1,
                  transition: "opacity 0.2s ease",
                }}
              >
                <Wallet style={{ width: "16px", height: "16px" }} />
                {payingNow
                  ? "Opening Razorpay…"
                  : !isAuthenticated
                  ? "Sign in to book"
                  : !selectedRoom?.is_available
                  ? "Room unavailable"
                  : stayTotal != null
                  ? `Book now · ${formatCurrency(stayTotal)}`
                  : "Book now"}
              </button>

              <a
                href={buildWhatsAppLink(whatsappMessage)}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  background: "transparent",
                  color: "#374151",
                  border: "1.5px solid rgba(0,0,0,0.12)",
                  borderRadius: "12px",
                  padding: "12px",
                  fontSize: "13px",
                  fontWeight: "600",
                  textDecoration: "none",
                  transition: "background 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f9fafb"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <Zap style={{ width: "14px", height: "14px", color: "#25d366" }} />
                Ask on WhatsApp
              </a>
            </div>
          </div>

          {/* Quick contact card */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.07)",
              borderRadius: "18px",
              padding: "18px",
            }}
          >
            <p style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "#2e7d67", fontWeight: "700", marginBottom: "12px" }}>
              Quick contact
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "#f9fafb", borderRadius: "12px" }}>
                <Phone style={{ width: "14px", height: "14px", color: "#2e7d67", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#111827" }}>
                  {hotel.settings?.phone || hotel.tenant?.phone || "—"}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", background: "#f9fafb", borderRadius: "12px" }}>
                <Mail style={{ width: "14px", height: "14px", color: "#2e7d67", flexShrink: 0 }} />
                <span style={{ fontSize: "13px", fontWeight: "600", color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {hotel.settings?.email || hotel.tenant?.email || "—"}
                </span>
              </div>
              {hotel.settings?.map_link && (
                <a
                  href={hotel.settings.map_link}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                    padding: "10px 12px",
                    background: "#f0fdf9",
                    borderRadius: "12px",
                    textDecoration: "none",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: "600", color: "#111827" }}>
                    <MapPin style={{ width: "14px", height: "14px", color: "#2e7d67" }} />
                    Open in maps
                  </span>
                  <ExternalLink style={{ width: "13px", height: "13px", color: "#2e7d67" }} />
                </a>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Responsive style helpers */}
      <style>{`
        @media (max-width: 900px) {
          .hotel-hero-grid { grid-template-columns: 1fr !important; }
          .rooms-grid { grid-template-columns: 1fr !important; }
          .contact-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default HotelDetailPage;
