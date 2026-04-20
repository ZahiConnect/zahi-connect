import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowLeft,
  FiCalendar,
  FiClock,
  FiMapPin,
  FiPhone,
  FiMail,
  FiShield,
  FiUsers,
  FiExternalLink
} from "react-icons/fi";
import { MdOutlineHotel, MdOutlineBed, MdChevronLeft, MdChevronRight } from "react-icons/md";
import { FaWhatsapp, FaCreditCard } from "react-icons/fa";
import { BiGlobe } from "react-icons/bi";
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
  if (!roomType) return (hotelStartingPrice != null && hotelStartingPrice > 0) ? hotelStartingPrice : null;
  const normalizedMode = normalizeRoomMode(roomMode);
  if (normalizedMode === "AC" && roomType.ac_price != null && roomType.ac_price > 0) return roomType.ac_price;
  if (normalizedMode === "Non AC" && roomType.non_ac_price != null && roomType.non_ac_price > 0) return roomType.non_ac_price;
  if (roomType.starting_price != null && roomType.starting_price > 0) return roomType.starting_price;
  if (roomType.ac_price != null && roomType.ac_price > 0) return roomType.ac_price;
  if (roomType.non_ac_price != null && roomType.non_ac_price > 0) return roomType.non_ac_price;
  return (hotelStartingPrice != null && hotelStartingPrice > 0) ? hotelStartingPrice : null;
};

const buildRoomGallery = (room) =>
  uniqueValues([
    ...(room?.image_urls || []),
    room?.image_url,
  ]);

const buildDirectRoomImages = (room) =>
  uniqueValues([...(room?.image_urls || []), room?.image_url]);

const getRoomDescription = (room, roomType, hotel) =>
  room?.notes ||
  roomType?.description ||
  hotel?.summary?.description ||
  hotel?.settings?.description ||
  "A comfortable, well-appointed room ready for a memorable stay. Contact the hotel for more details.";

/* ── FormField ─────────────────────────────────────────── */
const FormField = ({ label, icon: Icon, children }) => (
  <label className="block">
    <span className="flex items-center gap-1.5 text-xs font-bold text-gray-700 uppercase tracking-widest mb-2">
      {Icon && <Icon />}
      {label}
    </span>
    {children}
  </label>
);

const inputStyle = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none text-gray-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all";

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

  const selectedRoomImages = useMemo(
    () => buildRoomGallery(selectedRoom),
    [selectedRoom]
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

  const startInstantBooking = async () => {
    if (!hotel || !selectedRoom) {
      toast.error("Please select a room first.");
      return;
    }
    if (!selectedRoom.is_available) {
      toast.error("This room is not available. Please choose a different room.");
      return;
    }
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }
    if (!guestProfile.guestName.trim()) {
      toast.error("Please enter the lead guest name.");
      return;
    }
    if (!guestProfile.phone.trim()) {
      toast.error("Please enter a contact number.");
      return;
    }
    if (!stay.checkIn || !stay.checkOut) {
      toast.error("Please choose check-in and check-out dates.");
      return;
    }
    if (new Date(stay.checkIn) >= new Date(stay.checkOut)) {
      toast.error("Check-out date must be after check-in date.");
      return;
    }

    const effectiveNightlyRate =
      selectedRoomPrice ??
      hotel?.summary?.starting_price ??
      hotel?.settings?.starting_price ??
      null;

    if (effectiveNightlyRate == null || effectiveNightlyRate <= 0) {
      toast.error(
        "This room does not have a public price yet. Please contact the hotel via WhatsApp to request a quote."
      );
      return;
    }

    const effectiveTotal = Number((effectiveNightlyRate * roomNights).toFixed(2));

    setPayingNow(true);
    try {
      const bookingPayload = {
        service_type: "hotel",
        title: `Room ${selectedRoom.room_number} at ${hotelName}`,
        summary: `Room ${selectedRoom.room_number}, ${selectedRoom.type}, ${roomNights} night${roomNights !== 1 ? "s" : ""}, ${stay.guests} guest${stay.guests !== 1 ? "s" : ""}`,
        tenant_id: hotel.tenant?.id || null,
        tenant_slug: hotel.tenant?.slug || null,
        tenant_name: hotelName || null,
        total_amount: effectiveTotal,
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
          nightly_rate: effectiveNightlyRate,
          room_total_amount: effectiveTotal,
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
      if (!razorpayLoaded || !window.Razorpay) {
        throw new Error("Razorpay checkout failed to load. Please check your internet connection and try again.");
      }

      const razorpay = new window.Razorpay({
        ...checkoutData.checkout,
        theme: { color: "#4f46e5" }, // Indigo shade
        handler: async (result) => {
          try {
            await bookingService.verifyPayment({
              payment_order_id: checkoutData.payment_order_id,
              razorpay_order_id: result.razorpay_order_id,
              razorpay_payment_id: result.razorpay_payment_id,
              razorpay_signature: result.razorpay_signature,
            });
            toast.success("🎉 Payment confirmed! Your room is booked.");
            navigate("/account");
          } catch (err) {
            console.error("Hotel payment verification failed", err);
            toast.error(
              err.response?.data?.detail ||
                "Payment was received but confirmation failed. Please contact support."
            );
            setPayingNow(false);
          }
        },
        modal: {
          ondismiss: () => setPayingNow(false),
        },
      });

      razorpay.open();
    } catch (error) {
      console.error("Failed to start hotel payment", error);
      toast.error(
        error.response?.data?.detail ||
          error.message ||
          "Could not start payment right now. Please try again."
      );
      setPayingNow(false);
    }
  };

  const effectiveDisplayTotal =
    stayTotal ??
    (() => {
      const fallbackRate =
        hotel?.summary?.starting_price ?? hotel?.settings?.starting_price ?? null;
      return fallbackRate != null ? Number((fallbackRate * roomNights).toFixed(2)) : null;
    })();

  if (loading) {
    return (
      <div className="flex flex-col md:flex-row gap-6 p-6">
        <div className="flex-1 h-[520px] rounded-3xl bg-gray-100 animate-pulse" />
        <div className="w-full md:w-[380px] h-[520px] rounded-3xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="text-center py-24 px-10 bg-white rounded-3xl border border-gray-100 mt-10 max-w-2xl mx-auto shadow-sm">
        <div className="w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mx-auto mb-6">
          <MdOutlineHotel className="text-4xl text-indigo-500" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-4">
          Property unavailable
        </h1>
        <p className="text-gray-500 mb-8 max-w-md mx-auto">
          We couldn't find this property. It may have moved or is temporarily unlisted.
        </p>
        <Link
          to="/hotels"
          className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-full px-6 py-3 text-sm font-semibold hover:bg-black transition-colors"
        >
          <FiArrowLeft />
          Explore all hotels
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-white rounded-[32px] sm:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden mb-12 pb-32 p-4 md:p-6 lg:p-8 flex flex-col gap-8">

      <Link
        to="/hotels"
        className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 w-fit px-4 py-2 rounded-full"
      >
        <FiArrowLeft />
        All hotels
      </Link>

      {/* ── Hero section ── */}
      <section className="bg-gray-900 rounded-[32px] overflow-hidden grid grid-cols-1 lg:grid-cols-2 min-h-[440px] shadow-2xl relative">
        <div className="relative overflow-hidden h-[300px] lg:h-auto">
          {currentHeroImage ? (
            <img
              src={currentHeroImage}
              alt={hotelName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center min-h-[320px] bg-gray-800">
              <MdOutlineHotel className="text-6xl text-gray-600" />
            </div>
          )}
          
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-gray-900/90 hidden lg:block" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent lg:hidden" />

          {/* Badges */}
          <div className="absolute top-6 left-6 flex gap-2 flex-wrap z-10">
            <span className="bg-green-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-lg">
              {hotel.summary?.available_rooms || 0} rooms available
            </span>
            {hotel.summary?.property_type && (
              <span className="bg-white/20 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-lg">
                {hotel.summary.property_type}
              </span>
            )}
          </div>

          {/* Hero image nav */}
          {propertyImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => browseHeroImages(-1)}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-xl flex items-center justify-center hover:bg-white hover:scale-105 transition-all text-gray-900"
              >
                <MdChevronLeft className="text-2xl" />
              </button>
              <button
                type="button"
                onClick={() => browseHeroImages(1)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/90 shadow-xl flex items-center justify-center hover:bg-white hover:scale-105 transition-all text-gray-900"
              >
                <MdChevronRight className="text-2xl" />
              </button>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {propertyImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveHeroImageIndex(idx)}
                    className={`h-2 rounded-full transition-all duration-300 ${idx === activeHeroImageIndex ? "w-6 bg-white" : "w-2 bg-white/40"}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Info Box */}
        <div className="p-8 md:p-12 flex flex-col justify-between z-10 relative">
          <div>
            <span className="inline-flex items-center gap-1.5 text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase mb-6">
              Hotels & Stays
            </span>

            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-3">
              {hotelName}
            </h1>

            {hotel.summary?.tagline && (
              <p className="text-indigo-300 font-bold mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                {hotel.summary.tagline}
              </p>
            )}

            <p className="flex items-center gap-2 text-sm text-gray-400 mb-10">
              <FiMapPin className="text-indigo-400 shrink-0" />
              <span className="truncate">{formatAddress(hotel.settings?.address)}</span>
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-1">Starting from</p>
                <p className="text-white font-bold text-base">{hotel.summary?.starting_price ? formatCurrency(hotel.summary.starting_price) : "—"}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-1">Check In/Out</p>
                <p className="text-white font-bold text-base">{hotel.settings?.check_in_time || "14:00"} / {hotel.settings?.check_out_time || "11:00"}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-1">Total Rooms</p>
                <p className="text-white font-bold text-base">{hotel.summary?.total_rooms || 0}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-gray-500 font-bold mb-1">Room Types</p>
                <p className="text-white font-bold text-base">{hotel.summary?.room_type_count || 0} categories</p>
              </div>
            </div>
          </div>

          {(hotel.summary?.featured_amenities || []).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-white/10">
              {(hotel.summary.featured_amenities).slice(0, 6).map((a) => (
                 <span key={a} className="text-[10px] font-bold text-gray-300 bg-white/10 border border-white/10 rounded-full px-3 py-1 tracking-wider uppercase">
                   {a}
                 </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Contact links ── */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: hotel.settings?.map_link || "#", icon: FiMapPin, label: "Location", value: "Open in maps", external: !!hotel.settings?.map_link },
          { href: hotelWebsiteHref || "#", icon: BiGlobe, label: "Website", value: "Visit hotel site", external: !!hotelWebsiteHref },
          { href: hotel.settings?.phone ? `tel:${hotel.settings.phone}` : "#", icon: FiPhone, label: "Phone", value: hotel.settings?.phone || hotel.tenant?.phone || "—", external: false },
          { href: hotel.settings?.email ? `mailto:${hotel.settings.email}` : "#", icon: FiMail, label: "Email", value: hotel.settings?.email || hotel.tenant?.email || "—", external: false },
        ].map(({ href, icon: Icon, label, value, external }) => (
          <a
            key={label}
            href={href}
            target={external ? "_blank" : undefined}
            rel={external ? "noreferrer" : undefined}
            className="group block bg-white border border-gray-100 rounded-3xl p-5 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className="text-indigo-600" />
              <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{label}</span>
            </div>
            <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{value}</p>
          </a>
        ))}
      </section>

      {/* ── Main Layout ── */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Left Side */}
        <div className="flex-1 flex flex-col gap-6 w-full lg:w-auto">
          
          <div className="flex justify-between items-end border-b border-gray-200 pb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-indigo-600 font-bold mb-1">Available Rooms</p>
              <h2 className="text-3xl font-extrabold text-gray-900">Select your room</h2>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 hidden sm:block">
              {sortedRooms.length} rooms
            </span>
          </div>

          {sortedRooms.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {sortedRooms.map((room) => {
                const isSelected = String(selectedRoom?.room_number) === String(room.room_number);
                const directImages = buildDirectRoomImages(room);
                const previewImage = directImages[0] || null;

                let badgeColor = room.is_available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700";
                
                return (
                  <button
                    key={room.id || room.room_number}
                    type="button"
                    onClick={() => setSelectedRoomNumber(room.room_number)}
                    className={`flex flex-col text-left rounded-3xl overflow-hidden transition-all duration-300 relative ${
                      isSelected 
                        ? "border-2 border-indigo-600 bg-indigo-50/50 shadow-md scale-[1.02] z-10" 
                        : "border border-gray-100 bg-white hover:border-indigo-200 hover:shadow-lg"
                    }`}
                  >
                    <div className={`h-32 relative overflow-hidden bg-gray-100 ${isSelected ? "opacity-100" : "opacity-90 grayscale-[20%]"}`}>
                      {previewImage ? (
                        <img src={previewImage} alt={`Room`} className="w-full h-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <MdOutlineBed className="text-4xl text-gray-300" />
                        </div>
                      )}
                      <span className="absolute top-3 left-3 bg-white/95 text-gray-900 text-[10px] font-extrabold tracking-widest uppercase px-3 py-1 rounded-full shadow-sm">
                        #{room.room_number}
                      </span>
                    </div>

                    <div className="p-4">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <p className={`text-sm font-extrabold truncate ${isSelected ? "text-indigo-900" : "text-gray-900"}`}>
                          {room.type}
                        </p>
                        <span className={`text-[9px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 ${badgeColor}`}>
                          {room.status}
                        </span>
                      </div>
                      <p className={`text-xs font-semibold ${isSelected ? "text-indigo-600" : "text-gray-500"}`}>
                         Floor {room.floor || "G"} · {normalizeRoomMode(room.mode)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-10 text-center bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-gray-500">
              Rooms will appear here once the property team publishes availability.
            </div>
          )}

          {/* Selected Room Details */}
          {selectedRoom && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-white border border-gray-100 rounded-[32px] overflow-hidden mt-4 shadow-sm"
            >
              <div className="h-[400px] relative bg-gray-100">
                {currentRoomImage ? (
                   <img src={currentRoomImage} alt="Room View" className="w-full h-full object-cover" />
                ) : (
                   <div className="flex flex-col items-center justify-center h-full gap-4">
                     <MdOutlineBed className="text-6xl text-gray-300" />
                     <p className="text-gray-400 font-medium">No photos for this room yet</p>
                   </div>
                )}
                
                {selectedRoomImages.length > 1 && (
                  <>
                    <button onClick={() => browseRoomImages(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow-lg text-gray-900 transition-all hover:scale-105">
                      <MdChevronLeft className="text-2xl" />
                    </button>
                    <button onClick={() => browseRoomImages(1)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white shadow-lg text-gray-900 transition-all hover:scale-105">
                      <MdChevronRight className="text-2xl" />
                    </button>
                  </>
                )}

                {currentRoomImage && (
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-6 flex gap-2">
                    <span className="bg-white text-gray-900 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">{selectedRoom.type}</span>
                    <span className="bg-black/50 backdrop-blur-md text-white border border-white/20 text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full">{selectedRoomMode}</span>
                  </div>
                )}
              </div>

              {selectedRoomImages.length > 1 && (
                <div className="flex gap-3 overflow-x-auto p-4 bg-gray-50 border-b border-gray-100 custom-scrollbar">
                  {selectedRoomImages.map((url, idx) => (
                    <button key={idx} onClick={() => setActiveRoomImageIndex(idx)} className={`shrink-0 w-24 h-16 rounded-xl overflow-hidden transition-all ${idx === activeRoomImageIndex ? "border-2 border-indigo-600 scale-105" : "border-2 border-transparent opacity-60 hover:opacity-100"}`}>
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-2xl font-extrabold text-gray-900 mb-1">Room {selectedRoom.room_number}</h3>
                  <p className="text-indigo-600 text-xs font-bold uppercase tracking-widest mb-4">
                    {selectedRoom.type} · {selectedRoomMode}
                  </p>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {selectedRoomDescription}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                     <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Nightly rate</p>
                     <p className="text-base font-extrabold text-gray-900">{selectedRoomPrice != null ? formatCurrency(selectedRoomPrice) : "—"}</p>
                   </div>
                   <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                     <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-400 mb-1">Stay total</p>
                     <p className="text-base font-extrabold text-indigo-900">{effectiveDisplayTotal != null ? formatCurrency(effectiveDisplayTotal) : "—"}</p>
                   </div>
                   <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                     <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Availability</p>
                     <p className="text-base font-extrabold text-gray-900">{roomAvailabilityCount} available</p>
                   </div>
                   <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                     <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mb-1">Stay length</p>
                     <p className="text-base font-extrabold text-gray-900">{roomNights} night{roomNights !== 1 ? "s" : ""}</p>
                   </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Sidebar - Sticky Checkout */}
        <aside className="w-full lg:w-[400px] shrink-0 sticky top-24 flex flex-col gap-6">
          <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-xl shadow-indigo-900/5">
             
             <div className="bg-gray-900 p-8 relative overflow-hidden">
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500 rounded-full blur-3xl opacity-20"></div>
                
                <p className="text-[10px] text-indigo-300 font-extrabold tracking-[0.2em] uppercase mb-2">Reserve Stay</p>
                <h2 className="text-3xl font-extrabold text-white mb-2">
                  {selectedRoom ? `Room ${selectedRoom.room_number}` : "Select a room"}
                </h2>
                {selectedRoom && (
                  <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${selectedRoom.is_available ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                    {selectedRoom.status}
                  </span>
                )}
             </div>

             <div className="p-8 flex flex-col gap-5">
               <div className="flex gap-4 border-b border-gray-100 pb-6">
                  <div className="w-20 h-20 bg-gray-100 rounded-2xl overflow-hidden shrink-0">
                    {selectedRoomImages[0] ? (
                      <img src={selectedRoomImages[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-50"><MdOutlineBed className="text-2xl text-gray-300" /></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-extrabold text-gray-900 text-lg mb-0.5">Room {selectedRoom?.room_number || "—"}</p>
                    <p className="text-xs text-indigo-600 font-bold mb-2">{selectedRoomMode}</p>
                    <p className="text-sm font-extrabold">{selectedRoomPrice != null ? formatCurrency(selectedRoomPrice) : "—"} <span className="text-[10px] font-normal text-gray-400 uppercase">/ night</span></p>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <FormField label="Check In" icon={FiCalendar}>
                    <input type="date" value={stay.checkIn} onChange={e => setStay(c=>({...c, checkIn: e.target.value}))} className={inputStyle} />
                 </FormField>
                 <FormField label="Check Out" icon={FiCalendar}>
                    <input type="date" value={stay.checkOut} onChange={e => setStay(c=>({...c, checkOut: e.target.value}))} className={inputStyle} />
                 </FormField>
               </div>

               <div className="grid grid-cols-2 gap-3">
                 <FormField label="Guests" icon={FiUsers}>
                    <input type="number" min="1" max="8" value={stay.guests} onChange={e => setStay(c=>({...c, guests: clampGuests(e.target.value)}))} className={inputStyle} />
                 </FormField>
                 <FormField label="Contact" icon={FiPhone}>
                    <input type="tel" value={guestProfile.phone} onChange={e => setGuestProfile(c=>({...c, phone: e.target.value}))} className={inputStyle} placeholder="Mobile" />
                 </FormField>
               </div>
               
               <FormField label="Lead Guest" icon={FiShield}>
                  <input type="text" value={guestProfile.guestName} onChange={e => setGuestProfile(c=>({...c, guestName: e.target.value}))} className={inputStyle} placeholder="Full Name" />
               </FormField>
               
               <FormField label="Special Request" icon={FiMail}>
                  <textarea rows="2" value={specialRequest} onChange={e => setSpecialRequest(e.target.value)} className={`${inputStyle} resize-none`} placeholder="Quiet room..." />
               </FormField>

               <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mt-2 flex flex-col items-center text-center">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 mb-1">Total Payment</p>
                  <p className="text-3xl font-extrabold text-indigo-900 mb-1">{effectiveDisplayTotal != null ? formatCurrency(effectiveDisplayTotal) : "—"}</p>
                  <p className="text-xs text-indigo-600 font-bold">
                    {selectedRoom ? `${roomNights} night${roomNights !== 1 ? "s" : ""} · ${formatDateRange(stay.checkIn, stay.checkOut)}` : "Select room"}
                  </p>
               </div>

               <button
                 onClick={startInstantBooking}
                 disabled={payingNow || !selectedRoom || !selectedRoom?.is_available}
                 className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed flex justify-center items-center gap-2 mt-2"
               >
                 {payingNow ? "Processing..." : (
                   <>
                     <FaCreditCard />
                     {effectiveDisplayTotal != null ? `Pay ${formatCurrency(effectiveDisplayTotal)} Now` : "Confirm Booking"}
                   </>
                 )}
               </button>
             </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default HotelDetailPage;
