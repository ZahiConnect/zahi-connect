import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiArrowLeft,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiMapPin,
  FiSearch,
  FiUsers,
  FiX,
} from "react-icons/fi";
import {
  MdOutlineAccessTime,
  MdOutlineClass,
  MdOutlineEventSeat,
  MdOutlineFlight,
  MdOutlineFlightLand,
  MdOutlineFlightTakeoff,
} from "react-icons/md";
import { FaCreditCard } from "react-icons/fa";

import AirportField from "../components/AirportField";
import { useAuth } from "../context/AuthContext";
import useAirportSuggestions from "../hooks/useAirportSuggestions";
import { cleanText, parseAirportCode } from "../lib/airportSuggestions";
import { formatCurrency, todayDate } from "../lib/format";
import { loadRazorpayScript } from "../lib/razorpay";
import bookingService from "../services/bookingService";
import marketplaceService from "../services/marketplaceService";

const inputStyle = "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none text-gray-900 focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all";

const FormField = ({ label, icon: Icon, children }) => (
  <label className="block">
    <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
      {Icon && <Icon className="text-sky-500" />}
      {label}
    </span>
    {children}
  </label>
);

const Input = ({ label, ...props }) => (
  <div className="space-y-1.5 w-full">
    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest block">{label}</label>
    <input className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none focus:ring-4 focus:ring-sky-500/10 focus:border-sky-500 transition-all font-medium placeholder:text-gray-400 placeholder:font-normal" {...props} />
  </div>
);

const CabinMap = ({ cabin, travellers, selected = [], disabledSeats = [], onChange }) => {
  const disabledSeatSet = useMemo(
    () => new Set(disabledSeats.map((seat) => String(seat).toUpperCase())),
    [disabledSeats]
  );
  const layout = useMemo(() => {
    const c = cabin?.toLowerCase() || "economy";
    if (c === "business") return { rows: [1, 2, 3, 4], cols: ["A", "B", "C", "D"] };
    if (c === "first") return { rows: [1, 2], cols: ["A", "B"] };
    return { rows: [1, 2, 3, 4, 5, 6], cols: ["A", "B", "C", "D", "E", "F"] };
  }, [cabin]);

  const toggle = (seat) => {
    if (disabledSeatSet.has(seat.toUpperCase())) return;
    if (selected.includes(seat)) {
      onChange(selected.filter((item) => item !== seat));
      return;
    }
    if (selected.length < travellers) onChange([...selected, seat]);
    else onChange([...selected.slice(1), seat]);
  };

  return (
    <div className="p-5 bg-sky-50/30 border border-sky-100 rounded-[20px] col-span-1 md:col-span-2 mt-2">
      <p className="text-[11px] font-bold text-sky-600 uppercase tracking-widest text-center mb-6">Seat Selector ({cabin})</p>
      <div className="mx-auto flex flex-col items-center justify-center gap-2.5 sm:gap-3">
        {layout.rows.map((row) => (
          <div key={row} className="flex items-center gap-1.5 sm:gap-2.5">
            {layout.cols.map((col) => {
              const seat = `${row}${col}`;
              const selectedSeat = selected.includes(seat);
              const bookedSeat = disabledSeatSet.has(seat.toUpperCase()) && !selectedSeat;
              return (
                <button
                  key={seat}
                  type="button"
                  disabled={bookedSeat}
                  title={bookedSeat ? "Booked" : seat}
                  onClick={() => toggle(seat)}
                  className={`flex h-10 w-8 items-center justify-center rounded-t-xl rounded-b-md text-[10px] font-bold transition-all sm:h-11 sm:w-9 ${bookedSeat ? "cursor-not-allowed border-2 border-gray-200 bg-gray-200 text-gray-400 line-through" : selectedSeat ? "bg-sky-500 text-white shadow-md shadow-sky-500/20" : "bg-white border-2 border-slate-200 text-slate-500 hover:border-sky-300"}`}
                >
                  {seat}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-xs text-center font-bold text-gray-500 mt-6">
        {selected.length === 0 ? `Required: Select ${travellers} seat(s)` : `Allocated: ${selected.join(", ")}`}
        {disabledSeats.length > 0 && <span className="block mt-1 text-[10px] uppercase tracking-widest text-gray-400">Grey seats are booked</span>}
      </p>
    </div>
  );
};

const routeMatches = (query, city, code) => {
  const raw = cleanText(query);
  if (!raw) return true;
  const rawLower = raw.toLowerCase();
  const airportCode = parseAirportCode(raw).toLowerCase();
  const candidates = [city, code].map((item) => cleanText(item).toLowerCase()).filter(Boolean);

  return candidates.some((candidate) =>
    candidate.includes(rawLower) ||
    (airportCode && (candidate.includes(airportCode) || parseAirportCode(candidate).toLowerCase() === airportCode))
  );
};

const getRouteCode = (value) => parseAirportCode(value) || cleanText(value).slice(0, 3).toUpperCase();

const getFlightTimeValue = (flight, keys) => {
  for (const key of keys) {
    const value = cleanText(flight?.[key]);
    if (value) return value;
  }
  return "";
};

const formatRouteTime = (value) => {
  const time = cleanText(value);
  if (!time) return "--:--";
  const match = time.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
};

const getDepartureTime = (flight) =>
  formatRouteTime(getFlightTimeValue(flight, ["depart_time", "departTime", "departure_time", "departureTime"]));

const getArrivalTime = (flight) =>
  formatRouteTime(getFlightTimeValue(flight, ["arrive_time", "arriveTime", "arrival_time", "arrivalTime"]));

const getDurationMinutes = (flight) => {
  const value = Number(
    flight?.duration_min ??
    flight?.durationMin ??
    flight?.duration_minutes ??
    flight?.durationMinutes ??
    flight?.duration
  );
  return Number.isFinite(value) && value > 0 ? value : 0;
};

const formatDurationMinutes = (minutes) => {
  if (!minutes) return "pending";
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};

const normalizeCabinKey = (value) => {
  const cabin = cleanText(value).toLowerCase();
  if (cabin.includes("business")) return "business";
  if (cabin.includes("first")) return "first";
  return "economy";
};

const getBookedSeats = (flight, flightClass, date) => {
  const cabinKey = normalizeCabinKey(flightClass);
  const seats = flight?.booked_seats_by_date?.[date]?.[cabinKey] || [];
  return Array.isArray(seats) ? seats.map((seat) => String(seat).toUpperCase()) : [];
};

const getBookedCount = (flight, flightClass, date) => {
  const cabinKey = normalizeCabinKey(flightClass);
  const count = Number(flight?.booked_counts_by_date?.[date]?.[cabinKey]);
  if (Number.isFinite(count) && count > 0) return count;
  return getBookedSeats(flight, flightClass, date).length;
};

const getPriceAndSeats = (flight, flightClass, date) => {
  const cabinKey = normalizeCabinKey(flightClass);
  const bookedSeats = getBookedSeats(flight, cabinKey, date);
  const bookedCount = getBookedCount(flight, cabinKey, date);
  if (cabinKey === "business") {
    return {
      price: flight.business_price,
      seats: Math.max(0, Number(flight.business_seats || 0) - bookedCount),
      bookedSeats,
    };
  }
  if (cabinKey === "first") {
    return {
      price: flight.first_price,
      seats: Math.max(0, Number(flight.first_seats || 0) - bookedCount),
      bookedSeats,
    };
  }
  return {
    price: flight.economy_price,
    seats: Math.max(0, Number(flight.economy_seats || 0) - bookedCount),
    bookedSeats,
  };
};

const FlightPartnerPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookingFlightId, setBookingFlightId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedFlightData, setSelectedFlightData] = useState(null);
  const [passengerDetails, setPassengerDetails] = useState({ name: "", phone: "", seats: [] });
  const [form, setForm] = useState({
    from: searchParams.get("from") || "",
    to: searchParams.get("to") || "",
    departDate: searchParams.get("date") || todayDate(),
    travellers: Number(searchParams.get("travellers")) || 1,
    flightClass: searchParams.get("class") || "economy",
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    marketplaceService.getFlight(slug)
      .then((payload) => {
        if (active) setDetail(payload);
      })
      .catch((error) => {
        console.error("Failed to load flight partner", error);
        if (active) setDetail(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [slug]);

  const airlineName = detail?.settings?.display_name || detail?.summary?.name || detail?.tenant?.name || "Flight partner";
  const airlineLogo = detail?.settings?.logo || detail?.summary?.logo;
  const airlineCover = detail?.settings?.cover_image || detail?.summary?.cover_image || airlineLogo;
  const airlineInfo = useMemo(() => ({
    id: detail?.tenant?.id,
    name: airlineName,
    logo: airlineLogo,
    slug,
  }), [airlineLogo, airlineName, detail?.tenant?.id, slug]);
  const flights = useMemo(
    () => (detail?.flights || []).map((flight) => ({ ...flight, airline: airlineInfo })),
    [airlineInfo, detail?.flights]
  );

  const routeLabels = useMemo(() => {
    const values = [];
    flights.forEach((flight) => {
      if (flight.from_city) values.push(flight.from_city);
      if (flight.to_city) values.push(flight.to_city);
      if (flight.from_code) values.push(flight.from_code);
      if (flight.to_code) values.push(flight.to_code);
    });
    return values;
  }, [flights]);
  const airport = useAirportSuggestions(routeLabels);

  const filteredFlights = useMemo(
    () => flights.filter((flight) =>
      routeMatches(form.from, flight.from_city, flight.from_code) &&
      routeMatches(form.to, flight.to_city, flight.to_code)
    ),
    [flights, form.from, form.to]
  );

  const setField = (field, value) => {
    setForm((current) => {
      const next = { ...current, [field]: value };
      const nextParams = new URLSearchParams(searchParams);
      if (["from", "to"].includes(field)) {
        if (value) nextParams.set(field, value);
        else nextParams.delete(field);
      }
      setSearchParams(nextParams, { replace: true });
      return next;
    });
  };

  const selectRoute = (flight) => {
    const from = flight.from_city || flight.from_code || "";
    const to = flight.to_city || flight.to_code || "";
    setForm((current) => ({ ...current, from, to }));
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("from", from);
      next.set("to", to);
      return next;
    }, { replace: true });
  };

  const handleOpenBooking = async (flight, price) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/flights/${slug}${window.location.search}` } });
      return;
    }
    if (!price || price <= 0) {
      toast.error("Pricing information is currently unavailable for this flight.");
      return;
    }
    try {
      const latestDetail = await marketplaceService.getFlight(slug);
      setDetail(latestDetail);
      const latestAirlineInfo = {
        id: latestDetail?.tenant?.id,
        name: latestDetail?.settings?.display_name || latestDetail?.summary?.name || latestDetail?.tenant?.name || airlineName,
        logo: latestDetail?.settings?.logo || latestDetail?.summary?.logo || airlineLogo,
        slug,
      };
      const latestFlight = (latestDetail?.flights || [])
        .map((item) => ({ ...item, airline: latestAirlineInfo }))
        .find((item) => item.id === flight.id || item.flight_number === flight.flight_number) || flight;
      const latest = getPriceAndSeats(latestFlight, form.flightClass, form.departDate);
      if (!latest.price || latest.seats < form.travellers) {
        toast.error("Selected seats are no longer available for this flight.");
        return;
      }
      setSelectedFlightData({ flight: latestFlight, price: latest.price || price });
      setPassengerDetails({ name: "", phone: "", seats: [] });
      setCheckoutModalOpen(true);
    } catch {
      setSelectedFlightData({ flight, price });
      setPassengerDetails({ name: "", phone: "", seats: [] });
      setCheckoutModalOpen(true);
    }
  };

  const proceedToPayment = async () => {
    if (!passengerDetails.name || !passengerDetails.phone) {
      toast.error("Please fill in passenger details.");
      return;
    }
    if (passengerDetails.seats.length !== form.travellers) {
      toast.error(`Please select exactly ${form.travellers} seat(s).`);
      return;
    }

    const { flight, price } = selectedFlightData;
    const bookedSeats = getPriceAndSeats(flight, form.flightClass, form.departDate).bookedSeats;
    if (passengerDetails.seats.some((seat) => bookedSeats.includes(String(seat).toUpperCase()))) {
      toast.error("One or more selected seats were just booked. Please choose another seat.");
      return;
    }

    setCheckoutModalOpen(false);
    setBookingFlightId(flight.id);
    setSubmitting(true);

    try {
      const payload = {
        service_type: "flight",
        title: `Flight ${flight.flight_number}: ${flight.from_city} -> ${flight.to_city}`,
        summary: `${form.travellers} ticket${form.travellers > 1 ? "s" : ""}, ${form.flightClass.toUpperCase()} Class`,
        total_amount: price * form.travellers,
        currency: "INR",
        tenant_id: flight.airline.id,
        metadata: {
          flight_number: flight.flight_number,
          airline: flight.airline.name,
          origin: flight.from_city,
          origin_code: flight.from_code,
          destination: flight.to_city,
          destination_code: flight.to_code,
          departure_time: getDepartureTime(flight),
          arrival_time: getArrivalTime(flight),
          passengers: form.travellers,
          class: form.flightClass,
          date: form.departDate,
          aircraft: flight.aircraft_type,
          duration: getDurationMinutes(flight),
          lead_passenger: passengerDetails.name,
          contact_number: passengerDetails.phone,
          seats: passengerDetails.seats.join(", "),
        },
      };

      const { payment_order_id, checkout } = await bookingService.createPaymentCheckout(payload);
      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded || !window.Razorpay) {
        throw new Error("Razorpay failed to load. Please check your connection.");
      }

      const rzp = new window.Razorpay({
        ...checkout,
        theme: { color: "#0ea5e9" },
        handler: async (response) => {
          try {
            const loadToast = toast.loading("Confirming your booking...");
            await bookingService.verifyPayment({
              payment_order_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            toast.dismiss(loadToast);
            toast.success("Flight booked successfully!");
            navigate("/activity");
          } catch {
            toast.error("Payment verification failed. Please contact support.");
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setBookingFlightId(null);
          },
        },
      });
      rzp.open();
    } catch (error) {
      toast.error(error.response?.data?.detail || error.message || "Could not initialize booking.");
      setSubmitting(false);
      setBookingFlightId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] rounded-[24px] border border-gray-100 bg-white p-4 sm:rounded-[40px] sm:p-8">
        <div className="h-56 animate-pulse rounded-[24px] bg-gray-100 sm:h-72 sm:rounded-[32px]" />
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, index) => <div key={index} className="h-44 rounded-[28px] bg-gray-100 animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-[24px] border border-gray-100 bg-white p-8 text-center sm:rounded-[40px] sm:p-12">
        <MdOutlineFlight className="mx-auto text-6xl text-gray-200" />
        <h1 className="mt-4 text-3xl font-extrabold text-gray-900">Airline unavailable</h1>
        <Link to="/flights" className="mt-6 inline-flex items-center gap-2 rounded-full bg-gray-900 px-5 py-3 text-sm font-bold text-white">
          Back to flights <FiArrowRight />
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto mb-12 flex min-h-[80vh] max-w-7xl flex-col overflow-hidden rounded-[24px] border border-gray-100 bg-white px-3 pb-14 pt-4 shadow-sm sm:rounded-[40px] sm:px-4 sm:pb-20 sm:pt-6 md:px-8">
      <Link to="/flights" className="mb-6 inline-flex w-fit items-center gap-2 rounded-full bg-sky-50 px-4 py-2 text-sm font-bold text-sky-700 transition-colors hover:bg-sky-100">
        <FiArrowLeft /> All flight partners
      </Link>

      <section className="relative mb-8 overflow-hidden rounded-[24px] border border-slate-100 bg-slate-950 p-5 shadow-2xl sm:mb-10 sm:rounded-[36px] sm:p-8 md:p-12">
        {airlineCover && <img src={airlineCover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-sky-950/60" />
        <div className="relative z-10 grid gap-8 lg:grid-cols-[1fr_320px] lg:items-end">
          <div>
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <div className="h-16 w-16 rounded-2xl border border-white/10 bg-white p-3 shadow-xl">
                {airlineLogo ? <img src={airlineLogo} alt={airlineName} className="h-full w-full object-contain" /> : <MdOutlineFlight className="h-full w-full text-sky-500" />}
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-sky-100">
                <FiCheckCircle /> Partner Network
              </span>
            </div>
            <h1 className="max-w-3xl text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-6xl">{airlineName}</h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
              {detail?.settings?.description || detail?.summary?.description || "Browse every active route from this flight partner and book the itinerary that fits your trip."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Active routes</p>
              <p className="mt-1 text-3xl font-black text-white">{flights.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Starting from</p>
              <p className="mt-1 text-2xl font-black text-white">{detail?.summary?.starting_price ? formatCurrency(detail.summary.starting_price) : "NA"}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8 rounded-[24px] border border-gray-100 bg-gray-50/70 p-4 shadow-inner sm:mb-10 sm:rounded-[32px] sm:p-6">
        <div className="mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-600">Route switcher</p>
            <p className="mt-1 text-sm font-semibold text-gray-500">Change origin/destination to filter this partner&apos;s active routes.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-2 lg:grid-cols-5">
          <AirportField label="Departure" icon={MdOutlineFlightTakeoff} value={form.from} onChange={(value) => setField("from", value)} onSelect={(value) => setField("from", value)} onWarmup={airport.warmup} suggestions={airport.suggestions} loading={airport.loading} />
          <AirportField label="Destination" icon={MdOutlineFlightLand} value={form.to} onChange={(value) => setField("to", value)} onSelect={(value) => setField("to", value)} onWarmup={airport.warmup} suggestions={airport.suggestions} loading={airport.loading} />
          <FormField label="Travel Date" icon={FiCalendar}>
            <input type="date" min={todayDate()} value={form.departDate} onChange={(e) => setField("departDate", e.target.value)} className={inputStyle} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Travellers" icon={FiUsers}>
              <input type="number" min={1} max={9} value={form.travellers} onChange={(e) => setField("travellers", parseInt(e.target.value) || 1)} className={inputStyle} />
            </FormField>
            <FormField label="Class" icon={MdOutlineClass}>
              <select value={form.flightClass} onChange={(e) => setField("flightClass", e.target.value)} className={inputStyle}>
                <option value="economy">Economy</option>
                <option value="business">Business</option>
                <option value="first">First</option>
              </select>
            </FormField>
          </div>
          <button type="button" onClick={() => document.getElementById("partner-routes")?.scrollIntoView({ behavior: "smooth", block: "start" })} className="h-[54px] rounded-2xl bg-sky-600 px-5 text-sm font-bold text-white shadow-lg shadow-sky-600/20 transition-all hover:bg-sky-700 active:scale-95">
            <FiSearch className="mr-2 inline text-lg" />
            Show Routes
          </button>
        </div>
      </section>

      <section id="partner-routes" className="space-y-6">
        <div className="flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-sky-600 font-bold mb-1">Partner routes</p>
            <h2 className="text-3xl font-extrabold text-gray-900">{filteredFlights.length} Routes Available</h2>
          </div>
          <p className="text-xs font-semibold text-gray-400">Prices shown are for {form.travellers} passenger{form.travellers > 1 ? "s" : ""}</p>
        </div>

        {filteredFlights.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-gray-200 bg-gray-50 py-20 text-center">
            <MdOutlineFlight className="mx-auto mb-6 text-6xl text-gray-200" />
            <h3 className="text-xl font-bold text-gray-800">No routes match this switch</h3>
            <p className="mx-auto mt-2 max-w-sm text-gray-500">Clear the route fields to see every active flight from this partner.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredFlights.map((flight) => {
              const { price, seats } = getPriceAndSeats(flight, form.flightClass, form.departDate);
              const isAvailable = price > 0 && seats >= form.travellers;
              const fromCode = flight.from_code || getRouteCode(flight.from_city);
              const toCode = flight.to_code || getRouteCode(flight.to_city);
              const departureTime = getDepartureTime(flight);
              const arrivalTime = getArrivalTime(flight);
              const durationMinutes = getDurationMinutes(flight);

              return (
                <motion.div key={flight.id} layout className="group rounded-[24px] border border-gray-100 bg-white p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-sky-900/5 sm:rounded-[32px] sm:p-6 lg:p-8">
                  <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <button type="button" onClick={() => selectRoute(flight)} className="flex items-center gap-4 text-left sm:gap-5 lg:w-[260px]">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-gray-100 bg-gray-50 p-2">
                        {airlineLogo ? <img src={airlineLogo} alt={airlineName} className="h-full w-full object-contain" /> : <MdOutlineFlight className="text-3xl text-sky-400" />}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-gray-900">{flight.flight_number}</h4>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">{flight.aircraft_type || "Aircraft pending"}</p>
                      </div>
                    </button>

                    <div className="flex flex-1 flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center sm:gap-8 lg:gap-12">
                      <div className="text-center sm:text-right">
                        <p className="mb-2 text-3xl font-extrabold leading-none text-gray-900">{departureTime}</p>
                        <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-500 sm:justify-end">
                          <MdOutlineFlightTakeoff className="text-sky-500" /> {flight.from_city} ({fromCode})
                        </p>
                      </div>
                      <div className="flex w-full flex-col items-center sm:max-w-[160px]">
                        <div className="mb-2 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-gray-400">
                          <MdOutlineAccessTime /> Flight time {formatDurationMinutes(durationMinutes)}
                        </div>
                        <div className="relative h-[2px] w-full bg-gray-200">
                          <div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-100 bg-white shadow-sm">
                            <MdOutlineFlight className="rotate-90 text-sm text-sky-500" />
                          </div>
                        </div>
                        <button type="button" onClick={() => selectRoute(flight)} className="mt-3 rounded-full bg-sky-50 px-3 py-1 text-[9px] font-extrabold uppercase tracking-[0.2em] text-sky-600">
                          Switch to route
                        </button>
                      </div>
                      <div className="text-center sm:text-left">
                        <p className="mb-2 text-3xl font-extrabold leading-none text-gray-900">{arrivalTime}</p>
                        <p className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-gray-500 sm:justify-start">
                          <MdOutlineFlightLand className="text-sky-500" /> {flight.to_city} ({toCode})
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-stretch justify-between gap-4 border-t border-gray-100 pt-5 sm:flex-row sm:items-center lg:w-[220px] lg:flex-col lg:items-end lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                      <div className="text-center sm:text-left lg:text-right">
                        <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">Total</p>
                        <p className="text-2xl font-extrabold text-gray-900">{price ? formatCurrency(price * form.travellers) : "NA"}</p>
                        {isAvailable && <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-orange-500">{seats} Seats Left</p>}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenBooking(flight, price)}
                        disabled={submitting || !isAvailable}
                        className={`flex h-14 w-full items-center justify-center gap-2 rounded-2xl px-8 text-sm font-bold shadow-lg transition-all active:scale-95 sm:w-auto ${isAvailable ? "bg-gray-900 text-white shadow-gray-900/10 hover:bg-black" : "cursor-not-allowed bg-gray-100 text-gray-400 shadow-none"}`}
                      >
                        {bookingFlightId === flight.id ? "Booking..." : isAvailable ? "Book Now" : "Sold Out"}
                        {isAvailable && <FiArrowRight className="text-lg" />}
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      <AnimatePresence>
        {checkoutModalOpen && selectedFlightData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-[32px] border border-slate-100 bg-white shadow-2xl">
              <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-5 sm:space-y-8 sm:p-8">
                <div className="flex items-start justify-between gap-4 sm:items-center">
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-800">Passenger Details</h3>
                    <p className="mt-1 text-sm font-semibold text-gray-500">{selectedFlightData.flight.airline.name} - {selectedFlightData.flight.flight_number} - {form.departDate}</p>
                  </div>
                  <button type="button" onClick={() => setCheckoutModalOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-500 transition hover:bg-slate-100"><FiX size={20} /></button>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Input label="Lead Passenger Name" placeholder="John Doe" value={passengerDetails.name} onChange={(e) => setPassengerDetails({ ...passengerDetails, name: e.target.value })} />
                  <Input label="Contact Number" placeholder="+91 9876543210" value={passengerDetails.phone} onChange={(e) => setPassengerDetails({ ...passengerDetails, phone: e.target.value })} />
                  <CabinMap
                    cabin={form.flightClass}
                    travellers={form.travellers}
                    selected={passengerDetails.seats}
                    disabledSeats={getPriceAndSeats(selectedFlightData.flight, form.flightClass, form.departDate).bookedSeats}
                    onChange={(seats) => setPassengerDetails({ ...passengerDetails, seats })}
                  />
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Amount</p>
                    <p className="text-2xl font-extrabold text-gray-900">{formatCurrency(selectedFlightData.price * form.travellers)}</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Class & Travellers</p>
                    <p className="text-sm font-bold capitalize text-sky-600">{form.flightClass} - {form.travellers} Pax</p>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-white p-5 sm:flex-row sm:justify-end sm:p-6">
                <button type="button" onClick={() => setCheckoutModalOpen(false)} className="rounded-2xl bg-gray-50 px-6 py-3 text-sm font-bold text-gray-600 transition-all hover:bg-gray-100 active:scale-95">Cancel</button>
                <button type="button" onClick={proceedToPayment} className="flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-sky-600/20 transition-all hover:bg-sky-700 active:scale-95">
                  <FaCreditCard /> Proceed to Pay
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FlightPartnerPage;
