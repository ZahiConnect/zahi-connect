import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  BedDouble,
  CalendarDays,
  Clock3,
  Hotel,
  MapPin,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import {
  buildWhatsAppLink,
  formatAddress,
  formatCurrency,
  formatDateRange,
  shortText,
  todayDate,
} from "../lib/format";
import bookingService from "../services/bookingService";
import marketplaceService from "../services/marketplaceService";

const tomorrowDate = () => {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return next.toISOString().slice(0, 10);
};

const HotelDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState("");
  const [stay, setStay] = useState({
    checkIn: searchParams.get("checkIn") || todayDate(),
    checkOut: searchParams.get("checkOut") || tomorrowDate(),
    guests: Number(searchParams.get("guests") || "2"),
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await marketplaceService.getHotel(slug);
        if (active) {
          setHotel(data);
          setSelectedRoomType(data?.room_types?.[0]?.name || "");
        }
      } catch (error) {
        console.error("Failed to load hotel detail", error);
        if (active) {
          setHotel(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [slug]);

  const chosenRoomType = useMemo(
    () =>
      hotel?.room_types?.find((roomType) => roomType.name === selectedRoomType) ||
      hotel?.room_types?.[0],
    [hotel, selectedRoomType]
  );

  const whatsappMessage = useMemo(() => {
    if (!hotel) return "";
    return [
      `Hi Zahi, I want to enquire about ${hotel.tenant?.name}.`,
      `Check-in: ${stay.checkIn}`,
      `Check-out: ${stay.checkOut}`,
      `Guests: ${stay.guests}`,
      `Preferred room type: ${chosenRoomType?.name || "Please suggest one"}`,
    ].join("\n");
  }, [chosenRoomType?.name, hotel, stay.checkIn, stay.checkOut, stay.guests]);

  const submitBooking = async () => {
    if (!hotel) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }

    setSubmitting(true);
    try {
      await bookingService.createRequest({
        service_type: "hotel",
        title: `Stay request for ${hotel.tenant?.name}`,
        summary: `${stay.guests} guest(s), ${formatDateRange(stay.checkIn, stay.checkOut)}, ${chosenRoomType?.name || "Any room type"}`,
        tenant_id: hotel.tenant?.id || null,
        tenant_slug: hotel.tenant?.slug || null,
        tenant_name: hotel.tenant?.name || null,
        total_amount: chosenRoomType?.starting_price || hotel.summary?.starting_price || null,
        metadata: {
          check_in: stay.checkIn,
          check_out: stay.checkOut,
          guests: stay.guests,
          preferred_room_type: chosenRoomType?.name || null,
          room_mode_options: chosenRoomType?.modes || [],
          hotel_address: hotel.settings?.address || null,
        },
      });
      toast.success("Stay request saved to your account.");
      navigate("/account");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not save the stay request.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="soft-card h-[30rem] animate-pulse rounded-[36px]" />;
  }

  if (!hotel) {
    return (
      <div className="soft-card rounded-[36px] px-6 py-14 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf7f2] text-[#2e7d67]">
          <Hotel className="h-6 w-6" />
        </div>
        <h1 className="font-display mt-5 text-5xl text-[#1f1812]">Hotel not found</h1>
        <p className="mt-4 text-sm leading-7 text-[#68584b]">
          This hotel tenant is missing from the marketplace or does not have room data yet.
        </p>
        <Link
          to="/hotels"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1f1812] px-5 py-3 text-sm font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to hotels
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link to="/hotels" className="inline-flex items-center gap-2 text-sm font-medium text-[#2e7d67]">
        <ArrowLeft className="h-4 w-4" />
        Back to hotels
      </Link>

      <section className="glass-panel overflow-hidden rounded-[40px]">
        <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-[24rem] bg-[linear-gradient(135deg,#efddca_0%,#f6eadf_50%,#f0e4d7_100%)]">
            {hotel.summary?.logo ? (
              <img src={hotel.summary.logo} alt={hotel.tenant?.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[#9b7a63]">
                <Hotel className="h-12 w-12" />
              </div>
            )}
            <div className="absolute left-6 top-6 rounded-full bg-white/92 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#32695b]">
              {hotel.summary?.available_rooms || 0} rooms available now
            </div>
          </div>

          <div className="space-y-6 px-6 py-7 sm:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#c15d1f]">Hotel detail</p>
              <h1 className="font-display mt-4 text-6xl leading-none text-[#1f1812]">{hotel.tenant?.name}</h1>
              <p className="mt-5 inline-flex items-center gap-2 text-sm text-[#68584b]">
                <MapPin className="h-4 w-4" />
                {formatAddress(hotel.settings?.address)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[26px] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">From</p>
                <p className="mt-2 font-semibold text-[#1f1812]">
                  {hotel.summary?.starting_price ? formatCurrency(hotel.summary.starting_price) : "NA"}
                </p>
              </div>
              <div className="rounded-[26px] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Room types</p>
                <p className="mt-2 font-semibold text-[#1f1812]">{hotel.summary?.room_type_count || 0}</p>
              </div>
              <div className="rounded-[26px] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Check-in / out</p>
                <p className="mt-2 text-sm font-semibold text-[#1f1812]">
                  {hotel.settings?.check_in_time} / {hotel.settings?.check_out_time}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(hotel.summary?.room_type_labels || []).map((label) => (
                <span key={label} className="rounded-full bg-[#f4e6d8] px-3 py-1 text-xs font-medium text-[#5d4d40]">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] xl:grid-cols-[1.25fr_0.75fr]">
        <div className="space-y-6">
          <section className="soft-card rounded-[34px] p-5 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Room options</p>
                <h2 className="font-display mt-3 text-5xl leading-none text-[#1f1812]">Choose a stay style</h2>
              </div>
              <span className="rounded-full bg-[#eef7f2] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#32695b]">
                {hotel.room_types?.length || 0} types
              </span>
            </div>

            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {(hotel.room_types || []).map((roomType) => (
                <button
                  key={roomType.id}
                  type="button"
                  onClick={() => setSelectedRoomType(roomType.name)}
                  className={`rounded-[28px] border p-5 text-left transition ${
                    chosenRoomType?.name === roomType.name
                      ? "border-[#1f1812] bg-[#1f1812] text-white"
                      : "border-[rgba(96,73,53,0.12)] bg-[#fffdf9] text-[#1f1812]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-2xl font-semibold">{roomType.name}</h3>
                      <p className={`mt-3 text-sm leading-7 ${chosenRoomType?.name === roomType.name ? "text-white/76" : "text-[#68584b]"}`}>
                        {roomType.description || "Room description can be added from the owner dashboard later."}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${chosenRoomType?.name === roomType.name ? "bg-white/12 text-white" : "bg-[#eef7f2] text-[#32695b]"}`}>
                      {roomType.available_rooms} free
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className={`text-xs uppercase tracking-[0.18em] ${chosenRoomType?.name === roomType.name ? "text-white/58" : "text-[#a2856b]"}`}>Starting</p>
                      <p className="mt-2 font-semibold">
                        {roomType.starting_price ? formatCurrency(roomType.starting_price) : "NA"}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs uppercase tracking-[0.18em] ${chosenRoomType?.name === roomType.name ? "text-white/58" : "text-[#a2856b]"}`}>AC</p>
                      <p className="mt-2 font-semibold">
                        {roomType.ac_price ? formatCurrency(roomType.ac_price) : "NA"}
                      </p>
                    </div>
                    <div>
                      <p className={`text-xs uppercase tracking-[0.18em] ${chosenRoomType?.name === roomType.name ? "text-white/58" : "text-[#a2856b]"}`}>Non AC</p>
                      <p className="mt-2 font-semibold">
                        {roomType.non_ac_price ? formatCurrency(roomType.non_ac_price) : "NA"}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="soft-card rounded-[34px] p-5 sm:p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Inventory preview</p>
            <h2 className="font-display mt-3 text-5xl leading-none text-[#1f1812]">Live room board</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#68584b]">
              Customers can already see the real room structure and availability mood, even before
              you add a full transactional booking engine.
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(hotel.rooms || []).slice(0, 12).map((room) => (
                <div key={room.id} className="rounded-[26px] border border-[rgba(96,73,53,0.12)] bg-[#fffdf9] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Room</p>
                      <p className="mt-2 text-xl font-semibold text-[#1f1812]">{room.room_number}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${room.is_available ? "bg-[#eef7f2] text-[#32695b]" : "bg-[#f7ede3] text-[#8e3f11]"}`}>
                      {room.status}
                    </span>
                  </div>
                  <p className="mt-4 text-sm text-[#1f1812]">{room.type}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8a7869]">
                    Floor {room.floor} • {room.mode}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="soft-card rounded-[34px] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Book this stay</p>
            <h2 className="font-display mt-3 text-4xl leading-none text-[#1f1812]">Save a hotel request</h2>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#3f342a]">
                  <CalendarDays className="h-4 w-4" />
                  Check-in
                </span>
                <input
                  type="date"
                  value={stay.checkIn}
                  onChange={(event) => setStay((current) => ({ ...current, checkIn: event.target.value }))}
                  className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#2e7d67]"
                />
              </label>

              <label className="block">
                <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#3f342a]">
                  <Clock3 className="h-4 w-4" />
                  Check-out
                </span>
                <input
                  type="date"
                  value={stay.checkOut}
                  onChange={(event) => setStay((current) => ({ ...current, checkOut: event.target.value }))}
                  className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#2e7d67]"
                />
              </label>

              <label className="block">
                <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#3f342a]">
                  <Users className="h-4 w-4" />
                  Guests
                </span>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={stay.guests}
                  onChange={(event) =>
                    setStay((current) => ({ ...current, guests: Number(event.target.value) || 1 }))
                  }
                  className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#2e7d67]"
                />
              </label>
            </div>

            {chosenRoomType ? (
              <div className="mt-5 rounded-[26px] bg-[#fcf5ec] p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Selected room type</p>
                <p className="mt-2 text-lg font-semibold text-[#1f1812]">{chosenRoomType.name}</p>
                <p className="mt-2 text-sm leading-7 text-[#68584b]">
                  {shortText(chosenRoomType.description, 120) || "A live room type from the hotel dashboard."}
                </p>
                <p className="mt-3 text-sm font-semibold text-[#32695b]">
                  {chosenRoomType.starting_price
                    ? formatCurrency(chosenRoomType.starting_price)
                    : "Price on request"}
                </p>
              </div>
            ) : null}

            <button
              type="button"
              onClick={submitBooking}
              disabled={submitting}
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#1f1812] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Saving request..." : isAuthenticated ? "Save booking request" : "Sign in to book"}
            </button>

            <a
              href={buildWhatsAppLink(whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-[rgba(96,73,53,0.14)] bg-white px-5 py-3 text-sm font-semibold text-[#1f1812]"
            >
              Continue on WhatsApp
            </a>
          </div>

          <div className="soft-card rounded-[34px] p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Why this works</p>
            <div className="mt-4 space-y-3 text-sm leading-7 text-[#68584b]">
              <div className="rounded-[24px] bg-[#fbf2e7] px-4 py-4">
                Customer requests save into the new booking service.
              </div>
              <div className="rounded-[24px] bg-[#fbf2e7] px-4 py-4">
                Workspace operators still manage rooms from the existing hotel dashboard.
              </div>
              <div className="rounded-[24px] bg-[#fbf2e7] px-4 py-4">
                WhatsApp stays available as the fast handoff layer when you need it.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default HotelDetailPage;
