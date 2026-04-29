import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiSearch, 
  FiCalendar, 
  FiUsers, 
  FiArrowRight, 
  FiMapPin,
  FiInfo,
  FiCheckCircle,
  FiX
} from "react-icons/fi";
import { 
  MdOutlineFlightTakeoff, 
  MdOutlineFlightLand, 
  MdOutlineFlight,
  MdOutlineClass,
  MdOutlineAccessTime
} from "react-icons/md";
import { FaGlobeAmericas, FaCreditCard } from "react-icons/fa";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import { todayDate, formatCurrency } from "../lib/format";
import marketplaceService from "../services/marketplaceService";
import bookingService from "../services/bookingService";
import { loadRazorpayScript } from "../lib/razorpay";
import {
  OURAIRPORTS_CSV_URL,
  cacheAirportSuggestions,
  cleanText,
  filterAirportSuggestions,
  formatAirportLabel,
  getCachedAirportSuggestions,
  mergeAirportSuggestions,
  parseAirportCode,
  parseOurAirportsCsv,
} from "../lib/airportSuggestions";

/* ── Helpers ───────────────────────────────────────────── */

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

const AirportField = ({ label, icon: Icon, value, onChange, onSelect, onWarmup, suggestions, loading }) => {
  const [focused, setFocused] = useState(false);
  const matches = useMemo(
    () => filterAirportSuggestions(suggestions, value, 8),
    [suggestions, value]
  );
  const showPanel = focused && (loading || matches.length > 0);

  return (
    <div className="relative">
      <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
        {Icon && <Icon className="text-sky-500" />}
        {label}
      </span>
      <div className="relative">
        <input
          type="text"
          value={value}
          onFocus={() => {
            setFocused(true);
            onWarmup?.();
          }}
          onBlur={() => {
            window.setTimeout(() => setFocused(false), 120);
            const formatted = formatAirportLabel(value);
            if (formatted && formatted !== value) onChange(formatted);
          }}
          onChange={(event) => onChange(event.target.value)}
          placeholder="City or Airport Code"
          className={inputStyle}
        />
        <Icon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
      </div>

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-2xl shadow-sky-900/10">
          {loading && matches.length === 0 ? (
            <div className="px-4 py-3 text-xs font-bold text-gray-400">Loading airport suggestions...</div>
          ) : (
            matches.map((airport) => (
              <button
                key={`${airport.code || airport.value}-${airport.value}`}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(airport.value);
                  setFocused(false);
                }}
                className="block w-full px-4 py-3 text-left transition-colors hover:bg-sky-50"
              >
                <span className="block text-sm font-extrabold text-gray-900">{airport.value}</span>
                <span className="mt-0.5 block truncate text-[11px] font-semibold text-gray-400">{airport.label}</span>
              </button>
            ))
          )}
        </div>
      )}
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

const parseRouteLabel = (route = "") => {
  const label = cleanText(route);
  const separators = [String.fromCharCode(8594), "->", " to "];

  for (const separator of separators) {
    const index = label.indexOf(separator);
    if (index > -1) {
      return {
        from: cleanText(label.slice(0, index)),
        to: cleanText(label.slice(index + separator.length)),
      };
    }
  }

  return { from: label, to: "" };
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

const CabinMap = ({ cabin, travellers, selected = [], disabledSeats = [], onChange }) => {
  const disabledSeatSet = useMemo(
    () => new Set(disabledSeats.map((seat) => String(seat).toUpperCase())),
    [disabledSeats]
  );
  const [layout, setLayout] = useState({ rows: [], cols: [] });
  useEffect(() => {
    let numRows = 4, cols = ["A","B"];
    const c = cabin?.toLowerCase() || "economy";
    if (c === "economy") { numRows = 6; cols = ["A","B","C","D","E","F"]; }
    else if (c === "business") { numRows = 4; cols = ["A","B","C","D"]; }
    else if (c === "first") { numRows = 2; cols = ["A","B"]; }
    
    let rs = [];
    for(let r=1; r<=numRows; r++) rs.push(r);
    setLayout({ rows: rs, cols });
  }, [cabin, travellers]);

  const toggle = s => {
    if (disabledSeatSet.has(s.toUpperCase())) return;
    if (selected.includes(s)) onChange(selected.filter(x => x !== s));
    else {
      if (selected.length < travellers) onChange([...selected, s]);
      else {
        const newSel = [...selected];
        newSel.shift(); newSel.push(s);
        onChange(newSel);
      }
    }
  };

  return (
    <div className="p-5 bg-sky-50/30 border border-sky-100 rounded-[20px] col-span-1 md:col-span-2 mt-2">
       <p className="text-[11px] font-bold text-sky-600 uppercase tracking-widest text-center mb-6">Interactive Seat Selector ({cabin})</p>
       <div className="flex flex-col gap-3 justify-center items-center mx-auto">
         {layout.rows.map(r => (
           <div key={r} className="flex items-center gap-2.5">
             {layout.cols.map(c => {
               const s = `${r}${c}`;
               const isSel = selected.includes(s);
               const isBooked = disabledSeatSet.has(s.toUpperCase()) && !isSel;
               const cl = cabin?.toLowerCase() || "economy";
               const isAisle = (cl==="economy" && c==="C") || (cl==="business" && c==="B") || (cl==="first" && c==="A");
               return (
                 <div key={s} className={`${isAisle ? "mr-6" : ""}`}>
                   <button 
                     type="button"
                     disabled={isBooked}
                     title={isBooked ? "Booked" : s}
                     onClick={() => toggle(s)} 
                     className={`w-9 h-11 rounded-t-xl rounded-b-md text-[10px] font-bold flex items-center justify-center transition-all ${isBooked ? 'cursor-not-allowed border-2 border-gray-200 bg-gray-200 text-gray-400 line-through' : isSel ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20' : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-sky-300'}`}
                   >
                     {s}
                   </button>
                 </div>
               )
             })}
           </div>
         ))}
       </div>
       <p className="text-xs text-center font-bold text-gray-500 mt-6">
         {selected.length === 0 ? `Required: Select ${travellers} seat(s)` : `Allocated: ${selected.join(", ")}`}
         {disabledSeats.length > 0 && <span className="block mt-1 text-[10px] uppercase tracking-widest text-gray-400">Grey seats are booked</span>}
       </p>
    </div>
  )
};

const FlightsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  const [airlines, setAirlines] = useState([]);
  const [allFlights, setAllFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [flightDetailsLoading, setFlightDetailsLoading] = useState(false);
  const [airportSuggestions, setAirportSuggestions] = useState(() => getCachedAirportSuggestions());
  const [airportSuggestionsLoading, setAirportSuggestionsLoading] = useState(false);
  const flightDetailsPromiseRef = useRef(null);
  const airportWorkerRef = useRef(null);

  // Search state
  const [form, setForm] = useState({
    from: "",
    to: "",
    departDate: todayDate(),
    travellers: 1,
    flightClass: "economy",
  });

  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [bookingFlightId, setBookingFlightId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedFlightData, setSelectedFlightData] = useState(null);
  const [passengerDetails, setPassengerDetails] = useState({ name: "", phone: "", seats: [] });

  const setField = (field, value) => setForm(c => ({ ...c, [field]: value }));

  const routeAirportLabels = useMemo(() => {
    const values = [];
    airlines.forEach((airline) => {
      (airline.routes || []).forEach((route) => {
        const [from, to] = String(route).split("→").map(cleanText);
        if (from) values.push(from);
        if (to) values.push(to);
      });
    });
    allFlights.forEach((flight) => {
      if (flight.from_city) values.push(flight.from_city);
      if (flight.to_city) values.push(flight.to_city);
      if (flight.from_code) values.push(flight.from_code);
      if (flight.to_code) values.push(flight.to_code);
    });
    return values;
  }, [airlines, allFlights]);

  const airportOptions = useMemo(
    () => mergeAirportSuggestions(airportSuggestions, routeAirportLabels),
    [airportSuggestions, routeAirportLabels]
  );

  const loadFlightDetails = useCallback(async (sourceAirlines = airlines, options = {}) => {
    if (!options.force && allFlights.length > 0) return allFlights;
    if (flightDetailsPromiseRef.current) return flightDetailsPromiseRef.current;

    setFlightDetailsLoading(true);
    const promise = Promise.all((sourceAirlines || []).map(t => marketplaceService.getFlight(t.slug)))
      .then((details) => {
        const aggregated = [];
        details.forEach(d => {
          if (d.flights) {
            const airlineInfo = {
              name: d.settings?.display_name || d.tenant?.name,
              logo: d.settings?.logo,
              slug: d.tenant?.slug,
              id: d.tenant?.id
            };
            d.flights.forEach(f => {
              aggregated.push({ ...f, airline: airlineInfo });
            });
          }
        });
        setAllFlights(aggregated);
        return aggregated;
      })
      .catch((error) => {
        console.error("Failed to load flight schedules", error);
        return [];
      })
      .finally(() => {
        setFlightDetailsLoading(false);
        flightDetailsPromiseRef.current = null;
      });

    flightDetailsPromiseRef.current = promise;
    return promise;
  }, [airlines, allFlights]);

  const warmAirportSuggestions = useCallback(() => {
    if (airportSuggestions.length > 3 || airportSuggestionsLoading || airportWorkerRef.current) return;

    const cached = getCachedAirportSuggestions();
    if (cached.length) {
      setAirportSuggestions(cached);
      return;
    }

    setAirportSuggestionsLoading(true);

    if (typeof Worker !== "undefined") {
      const worker = new Worker(new URL("../workers/airportSuggestions.worker.js", import.meta.url), { type: "module" });
      airportWorkerRef.current = worker;
      worker.onmessage = (event) => {
        if (event.data?.type === "airports-loaded") {
          const suggestions = event.data.suggestions || [];
          cacheAirportSuggestions(suggestions);
          setAirportSuggestions(suggestions);
        }
        setAirportSuggestionsLoading(false);
        worker.terminate();
        airportWorkerRef.current = null;
      };
      worker.onerror = () => {
        setAirportSuggestionsLoading(false);
        worker.terminate();
        airportWorkerRef.current = null;
      };
      worker.postMessage({ type: "load-airports" });
      return;
    }

    fetch(OURAIRPORTS_CSV_URL)
      .then((response) => {
        if (!response.ok) throw new Error("Airport data could not be loaded.");
        return response.text();
      })
      .then((csv) => {
        const suggestions = parseOurAirportsCsv(csv);
        cacheAirportSuggestions(suggestions);
        setAirportSuggestions(suggestions);
      })
      .catch(() => {})
      .finally(() => setAirportSuggestionsLoading(false));
  }, [airportSuggestions.length, airportSuggestionsLoading]);

  useEffect(() => {
    let active = true;
    const fetchFlights = async () => {
      setLoading(true);
      try {
        const tenantSummaries = await marketplaceService.getFlights();
        if (!active) return;
        setAirlines(tenantSummaries || []);
        const runInIdle = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 500));
        runInIdle(() => {
          if (active) loadFlightDetails(tenantSummaries || []);
        });
      } catch (err) {
        console.error("Failed to load flights", err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchFlights();
    return () => { active = false; };
  }, []);

  useEffect(() => () => {
    if (airportWorkerRef.current) airportWorkerRef.current.terminate();
  }, []);

  const searchFlights = async (override = {}) => {
    const criteria = {
      ...form,
      ...override,
    };

    if (!criteria.from.trim() || !criteria.to.trim()) {
      toast.error("Please enter both source and destination cities.");
      return;
    }
    const flights = await loadFlightDetails(airlines, { force: true });
    
    const results = flights.filter(f => 
      routeMatches(criteria.from, f.from_city, f.from_code) &&
      routeMatches(criteria.to, f.to_city, f.to_code)
    );
    setSearchResults(results);
    setHasSearched(true);
    
    if (results.length === 0) {
      toast.error("No flights found for this route.");
    } else {
      toast.success(`Found ${results.length} flights!`);
    }
  };

  const selectRoute = (route) => {
    const { from, to } = parseRouteLabel(route);
    if (!from || !to) return;

    setForm((current) => ({ ...current, from, to }));
    searchFlights({ from, to });
    window.scrollTo({ top: 400, behavior: "smooth" });
  };

  const handleOpenBooking = async (flight, price) => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/flights" } });
      return;
    }
    
    if (!price || price <= 0) {
      toast.error("Pricing information is currently unavailable for this flight.");
      return;
    }

    try {
      const latestFlights = await loadFlightDetails(airlines, { force: true });
      const latestFlight = latestFlights.find(
        (item) =>
          item.id === flight.id ||
          (item.flight_number === flight.flight_number && item.airline?.id === flight.airline?.id)
      ) || flight;
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
        title: `Flight ${flight.flight_number}: ${flight.from_city} → ${flight.to_city}`,
        summary: `${form.travellers} ticket${form.travellers > 1 ? 's' : ''}, ${form.flightClass.toUpperCase()} Class`,
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
          departure_time: flight.depart_time,
          arrival_time: flight.arrive_time,
          passengers: form.travellers,
          class: form.flightClass,
          date: form.departDate,
          aircraft: flight.aircraft_type,
          duration: flight.duration_min,
          lead_passenger: passengerDetails.name,
          contact_number: passengerDetails.phone,
          seats: passengerDetails.seats.join(", ")
        },
      };

      const { payment_order_id, checkout } = await bookingService.createPaymentCheckout(payload);

      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded || !window.Razorpay) {
        throw new Error("Razorpay failed to load. Please check your connection.");
      }

      const options = {
        ...checkout,
        theme: { color: "#0ea5e9" }, // Sky blue
        handler: async (response) => {
          try {
            setSubmitting(true);
            const loadToast = toast.loading("Confirming your booking...");

            await bookingService.verifyPayment({
              payment_order_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.dismiss(loadToast);
            toast.success("🛫 Flight booked successfully!");
            navigate("/activity");
          } catch (err) {
            toast.error("Payment verification failed. Please contact support.");
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setBookingFlightId(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || "Could not initialize booking.");
      setSubmitting(false);
      setBookingFlightId(null);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="min-h-[80vh] bg-white rounded-[32px] sm:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden mb-12 flex flex-col pt-6 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
      
      {/* Hero Section */}
      <motion.section 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 relative"
      >
        <div className="bg-white rounded-[32px] md:rounded-[40px] p-8 md:p-14 lg:p-16 border-2 border-slate-100 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
             <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[60%] bg-gradient-to-bl from-sky-200/50 via-sky-100/30 to-transparent rounded-full blur-3xl mix-blend-multiply" />
             <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-gradient-to-tr from-blue-200/40 via-sky-50/20 to-transparent rounded-full blur-3xl mix-blend-multiply" />
          </div>

          {/* Floating Icons */}
          <div className="absolute inset-0 pointer-events-none hidden md:block">
            <motion.div 
              animate={{ y: [0, -15, 0], x: [0, 10, 0], rotate: [0, 5, 0] }} 
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[10%] right-[15%] text-sky-200 opacity-60 drop-shadow-xl"
            >
              <MdOutlineFlight className="w-24 h-24 rotate-45" />
            </motion.div>
            <motion.div 
              animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }} 
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-[20%] right-[5%] text-blue-200 opacity-50 drop-shadow-lg"
            >
              <FaGlobeAmericas className="w-16 h-16" />
            </motion.div>
            <motion.div 
              animate={{ y: [0, -10, 0], x: [0, -10, 0] }} 
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute top-[30%] left-[8%] text-slate-200 opacity-40 drop-shadow-md"
            >
              <MdOutlineFlightTakeoff className="w-12 h-12" />
            </motion.div>
          </div>

          <div className="relative z-10 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="inline-flex items-center gap-2 bg-sky-50 text-sky-600 border border-sky-100 px-5 py-2 rounded-full text-xs font-bold tracking-[0.2em] uppercase mb-6 shadow-sm">
                <FiMapPin className="animate-bounce" /> Explore the World
              </span>
            </motion.div>
            
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-slate-800 mb-6 drop-shadow-sm"
            >
              Elevate your <br className="hidden md:block"/> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-500 to-blue-600">travel experience.</span>
            </motion.h1>
            
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-slate-500 text-lg md:text-xl leading-relaxed max-w-xl mb-12"
            >
              Unlock seamless global connectivity. Compare elite airlines, book direct routes, and embark on unforgettable journeys with zero hidden fees.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid grid-cols-2 md:grid-cols-3 gap-4"
            >
              <div className="bg-slate-50/80 backdrop-blur-sm border border-slate-100 rounded-2xl p-4 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><FiUsers className="text-sky-500"/> Partners</p>
                <p className="text-3xl font-black text-slate-800">{airlines.length || "25+"}</p>
              </div>
              <div className="bg-slate-50/80 backdrop-blur-sm border border-slate-100 rounded-2xl p-4 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><MdOutlineFlight className="text-sky-500"/> Routes</p>
                <p className="text-3xl font-black text-slate-800">{allFlights.length || "1200+"}</p>
              </div>
              <div className="hidden md:flex bg-gradient-to-br from-sky-50 to-blue-50/50 backdrop-blur-sm border border-sky-100 rounded-2xl p-4 flex-col justify-center items-center text-center shadow-sm hover:shadow-md hover:-translate-y-1 transition-all">
                <p className="text-[10px] text-sky-600 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><FiCheckCircle className="text-blue-500"/> Platform Fee</p>
                <p className="text-3xl font-black text-sky-600 font-mono">0%</p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Search Bar Container */}
      <section className="bg-gray-50/50 border border-gray-100 rounded-[32px] p-6 mb-12 shadow-inner">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <AirportField
            label="Departure"
            icon={MdOutlineFlightTakeoff}
            value={form.from}
            onChange={(value) => setField("from", value)}
            onSelect={(value) => setField("from", value)}
            onWarmup={warmAirportSuggestions}
            suggestions={airportOptions}
            loading={airportSuggestionsLoading}
          />

          <AirportField
            label="Destination"
            icon={MdOutlineFlightLand}
            value={form.to}
            onChange={(value) => setField("to", value)}
            onSelect={(value) => setField("to", value)}
            onWarmup={warmAirportSuggestions}
            suggestions={airportOptions}
            loading={airportSuggestionsLoading}
          />

          <FormField label="Travel Date" icon={FiCalendar}>
            <input 
              type="date" 
              min={todayDate()} 
              value={form.departDate} 
              onChange={e => setField("departDate", e.target.value)} 
              className={inputStyle} 
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
             <FormField label="Travellers" icon={FiUsers}>
                <input 
                  type="number" 
                  min={1} 
                  max={9} 
                  value={form.travellers} 
                  onChange={e => setField("travellers", parseInt(e.target.value)||1)} 
                  className={inputStyle} 
                />
             </FormField>
             <FormField label="Class" icon={MdOutlineClass}>
                <select 
                  value={form.flightClass} 
                  onChange={e => setField("flightClass", e.target.value)} 
                  className={inputStyle}
                >
                  <option value="economy">Economy</option>
                  <option value="business">Business</option>
                  <option value="first">First</option>
                </select>
             </FormField>
          </div>

          <button 
            onClick={searchFlights} 
            disabled={flightDetailsLoading}
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold h-[54px] rounded-2xl shadow-lg shadow-sky-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {flightDetailsLoading ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <FiSearch className="text-lg" />
            )}
            {flightDetailsLoading ? "Loading..." : "Search Flights"}
          </button>
        </div>
      </section>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {hasSearched ? (
          <motion.section 
            key="results"
            initial="hidden"
            animate="show"
            variants={containerVariants}
            className="space-y-8"
          >
            <div className="flex justify-between items-end border-b border-gray-100 pb-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-sky-600 font-bold mb-1">Flight Schedules</p>
                <h2 className="text-3xl font-extrabold text-gray-900">{searchResults.length} Flights Found</h2>
              </div>
              <p className="text-xs font-semibold text-gray-400 hidden sm:block">
                Prices shown are for {form.travellers} passenger{form.travellers > 1 ? 's' : ''}
              </p>
            </div>

            {searchResults.length === 0 ? (
              <motion.div variants={itemVariants} className="text-center py-20 bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                <MdOutlineFlight className="text-6xl text-gray-200 mx-auto mb-6" />
                <h3 className="text-xl font-bold text-gray-800 mb-2">No direct routes found</h3>
                <p className="text-gray-500 max-w-sm mx-auto">Try adjust your search parameters or check a different travel date.</p>
              </motion.div>
            ) : (
              <div className="grid gap-6">
                {searchResults.map(f => {
                  const { price, seats } = getPriceAndSeats(f, form.flightClass, form.departDate);
                  const isAvailable = price > 0 && seats >= form.travellers;

                  return (
                    <motion.div 
                      key={f.id} 
                      variants={itemVariants}
                      className="group bg-white border border-gray-100 rounded-[32px] p-6 lg:p-8 flex flex-col lg:flex-row items-center justify-between gap-8 hover:shadow-2xl hover:shadow-sky-900/5 hover:-translate-y-1 transition-all duration-300"
                    >
                      {/* Airline Info */}
                      <div className="flex items-center gap-5 w-full lg:w-[250px]">
                        <div className="w-16 h-16 shrink-0 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-center p-2 group-hover:bg-white transition-colors">
                          {f.airline.logo ? (
                            <img src={f.airline.logo} alt={f.airline.name} className="w-full h-full object-contain" />
                          ) : (
                            <MdOutlineFlight className="text-3xl text-sky-400" />
                          )}
                        </div>
                        <div className="truncate">
                          <h4 className="font-extrabold text-gray-900 truncate">{f.airline.name}</h4>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            <span>{f.flight_number}</span>
                            <span className="w-1 h-1 bg-gray-300 rounded-full" />
                            <span className="truncate">{f.aircraft_type}</span>
                          </div>
                        </div>
                      </div>

                      {/* Journey Details */}
                      <div className="flex-1 flex items-center justify-center gap-6 sm:gap-12 w-full">
                        <div className="text-center sm:text-right">
                          <p className="text-3xl font-extrabold text-gray-900 leading-none mb-2">{f.depart_time}</p>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center justify-center sm:justify-end gap-1.5">
                            <MdOutlineFlightTakeoff className="text-sky-500" /> {f.from_city} ({f.from_code})
                          </p>
                        </div>

                        <div className="flex flex-col items-center w-full max-w-[120px] sm:max-w-[180px]">
                          <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">
                             <MdOutlineAccessTime className="text-xs" />
                             {Math.floor(f.duration_min/60)}h {f.duration_min%60}m
                          </div>
                          <div className="relative w-full h-[2px] bg-gray-200">
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-gray-100 flex items-center justify-center shadow-sm">
                              <MdOutlineFlight className="text-sky-500 text-sm rotate-90" />
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] font-extrabold uppercase tracking-[0.2em] text-green-500 mt-3">
                            <FiCheckCircle /> Direct
                          </div>
                        </div>

                        <div className="text-center sm:text-left">
                          <p className="text-3xl font-extrabold text-gray-900 leading-none mb-2">{f.arrive_time}</p>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center justify-center sm:justify-start gap-1.5">
                            <MdOutlineFlightLand className="text-sky-500" /> {f.to_city} ({f.to_code})
                          </p>
                        </div>
                      </div>

                      {/* Pricing & Booking */}
                      <div className="w-full lg:w-[220px] border-t lg:border-t-0 lg:border-l border-gray-100 pt-6 lg:pt-0 lg:pl-8 flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-4">
                        <div className="text-left lg:text-right">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                            Total · {form.travellers} Ticket{form.travellers > 1 ? 's' : ''}
                          </p>
                          <p className="text-2xl font-extrabold text-gray-900">
                             {price ? formatCurrency(price * form.travellers) : "—"}
                          </p>
                          {isAvailable && (
                            <p className="text-[10px] font-bold text-orange-500 mt-1 uppercase tracking-widest">
                              {seats} Seats Left!
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleOpenBooking(f, price)}
                          disabled={submitting || !isAvailable}
                          className={`rounded-2xl h-14 px-8 font-bold text-sm transition-all flex items-center gap-2 active:scale-95 shadow-lg ${
                            isAvailable 
                              ? "bg-gray-900 text-white hover:bg-black shadow-gray-900/10" 
                              : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                          }`}
                        >
                          {bookingFlightId === f.id ? (
                            <span className="flex items-center gap-2">
                             <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                             Booking...
                            </span>
                          ) : (
                            <>
                              {isAvailable ? "Book Now" : "Sold Out"}
                              <FiArrowRight className="text-lg" />
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.section>
        ) : (
          /* Discovery Section (Before Search) */
          <motion.section 
            key="discovery"
            initial="hidden"
            animate="show"
            variants={containerVariants}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-sky-50 rounded-xl flex items-center justify-center text-sky-600">
                <MdOutlineFlight className="text-2xl" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-sky-600 font-bold mb-0.5">Partner Networks</p>
                <h3 className="text-2xl font-extrabold text-gray-900">Airlines on Zahi Connect</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                /* Skeleton Loader */
                [...Array(6)].map((_, i) => (
                  <div key={i} className="h-44 bg-gray-50 rounded-[32px] animate-pulse border border-gray-100" />
                ))
              ) : airlines.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                  <FiInfo className="text-4xl text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-semibold">No active airlines currently connected to our network.</p>
                </div>
              ) : (
                airlines.map(airline => (
                  <motion.div 
                    key={airline.id} 
                    variants={itemVariants}
                    onMouseDown={() => navigate(`/flights/${airline.slug}`)}
                    onClick={() => {
                      navigate(`/flights/${airline.slug}`);
                      return;
                      if (airline.routes?.length > 0) {
                        selectRoute(airline.routes[0]);
                        return;
                        const [from, to] = airline.routes[0].split(" → ");
                        setField("from", from);
                        setField("to", to);
                        window.scrollTo({ top: 400, behavior: "smooth" });
                      }
                    }} 
                    className="group bg-white border border-gray-100 rounded-[32px] p-6 hover:shadow-2xl hover:shadow-sky-900/5 transition-all duration-300 cursor-pointer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all">
                      <FiArrowRight className="text-sky-500 text-xl" />
                    </div>

                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center p-2 border border-gray-100">
                        {airline.logo ? (
                          <img src={airline.logo} className="w-full h-full object-contain" alt={airline.name} />
                        ) : (
                          <MdOutlineFlight className="text-2xl text-sky-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-gray-900 group-hover:text-sky-600 transition-colors uppercase text-sm tracking-wide">{airline.name}</h4>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{airline.total_flights} Active Flights</p>
                      </div>
                    </div>

                    {airline.routes?.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-[9px] font-extrabold text-gray-400 uppercase tracking-[0.2em]">Top Connections</p>
                        <div className="flex flex-wrap gap-2">
                          {airline.routes.slice(0, 2).map((route) => (
                            <button
                              key={route}
                              type="button"
                              onMouseDown={(event) => event.stopPropagation()}
                              onClick={(event) => {
                                event.stopPropagation();
                                const { from, to } = parseRouteLabel(route);
                                navigate(`/flights/${airline.slug}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
                              }}
                              className="bg-sky-50 text-sky-600 border border-sky-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors hover:bg-sky-100"
                            >
                              {route}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Booking Details Modal */}
      <AnimatePresence>
        {checkoutModalOpen && selectedFlightData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-100"
            >
              <div className="p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-extrabold text-slate-800">Passenger Details</h3>
                    <p className="text-sm font-semibold text-gray-500 mt-1">
                      {selectedFlightData.flight.airline.name} • {selectedFlightData.flight.flight_number} • {form.departDate}
                    </p>
                  </div>
                  <button onClick={() => setCheckoutModalOpen(false)} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 flex items-center justify-center rounded-full text-slate-500 transition"><FiX size={20}/></button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input 
                    label="Lead Passenger Name" 
                    placeholder="John Doe" 
                    value={passengerDetails.name} 
                    onChange={e => setPassengerDetails({...passengerDetails, name: e.target.value})} 
                  />
                  <Input 
                    label="Contact Number" 
                    placeholder="+91 9876543210" 
                    value={passengerDetails.phone} 
                    onChange={e => setPassengerDetails({...passengerDetails, phone: e.target.value})} 
                  />
                  <CabinMap 
                    cabin={form.flightClass} 
                    travellers={form.travellers} 
                    selected={passengerDetails.seats} 
                    disabledSeats={getPriceAndSeats(selectedFlightData.flight, form.flightClass, form.departDate).bookedSeats}
                    onChange={s => setPassengerDetails({...passengerDetails, seats: s})} 
                  />
                </div>
                
                <div className="bg-gray-50 rounded-2xl p-4 flex justify-between items-center border border-gray-100">
                   <div>
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Amount</p>
                     <p className="text-2xl font-extrabold text-gray-900">{formatCurrency(selectedFlightData.price * form.travellers)}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Class & Travellers</p>
                     <p className="text-sm font-bold text-sky-600 capitalize">{form.flightClass} • {form.travellers} Pax</p>
                   </div>
                </div>
              </div>
              
              <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white shrink-0">
                <button 
                  onClick={() => setCheckoutModalOpen(false)}
                  className="px-6 py-3 rounded-2xl font-bold text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={proceedToPayment}
                  className="px-6 py-3 rounded-2xl font-bold text-sm text-white bg-sky-600 hover:bg-sky-700 shadow-lg shadow-sky-600/20 transition-all active:scale-95 flex items-center gap-2"
                >
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

export default FlightsPage;
