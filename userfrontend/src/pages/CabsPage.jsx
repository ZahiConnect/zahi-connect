import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiMapPin, 
  FiClock, 
  FiArrowRight, 
  FiUsers, 
  FiPhone,
  FiNavigation,
  FiCheckCircle,
  FiShield,
  FiInfo,
  FiSearch,
  FiCalendar,
  FiZap
} from "react-icons/fi";
import { 
  MdOutlineLocalTaxi, 
  MdOutlineDirectionsCar,
  MdOutlineSpeed,
  MdOutlineRoute
} from "react-icons/md";
import { FaCarSide } from "react-icons/fa";
import toast from "react-hot-toast";

import LocationPicker from "../components/LocationPicker";
import { useAuth } from "../context/AuthContext";
import useCustomerLocation from "../hooks/useCustomerLocation";
import { formatCurrency, formatDistance, formatShortDate, todayDate } from "../lib/format";
import bookingService from "../services/bookingService";
import mobilityService from "../services/mobilityService";

/* ── Helpers ───────────────────────────────────────────── */

const inputStyle = "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm outline-none text-gray-900 focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all";

const FormField = ({ label, icon: Icon, children }) => (
  <label className="block">
    <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">
      {Icon && <Icon className="text-orange-500" />}
      {label}
    </span>
    {children}
  </label>
);

const CabsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const {
    coordinates,
    locationLabel,
  } = useCustomerLocation(true);
  
  const coordinateKey = coordinates
    ? `${coordinates.latitude.toFixed(5)}:${coordinates.longitude.toFixed(5)}`
    : "no-location";
    
  const driverAppUrl = import.meta.env.VITE_DRIVER_APP_URL || "http://localhost:5175";
  const lastLocationPickupRef = useRef("");

  const [submitting, setSubmitting] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [confirmedRide, setConfirmedRide] = useState(null);
  const [form, setForm] = useState({
    pickup: "",
    drop: "",
    travelDate: todayDate(),
    passengers: 2,
    notes: "",
  });

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  useEffect(() => {
    if (!locationLabel) return;
    setForm((current) => {
      const shouldReplacePickup =
        !current.pickup || current.pickup === lastLocationPickupRef.current;
      if (!shouldReplacePickup) return current;
      lastLocationPickupRef.current = locationLabel;
      return { ...current, pickup: locationLabel };
    });
  }, [locationLabel]);

  useEffect(() => {
    let active = true;
    const loadNearbyDrivers = async () => {
      setLoadingDrivers(true);
      try {
        const data = await mobilityService.getNearbyDrivers(
          coordinates
            ? {
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
                radius_km: 30,
                limit: 10,
              }
            : { limit: 10 }
        );

        if (!active) return;
        const normalized = Array.isArray(data) ? data : [];
        setNearbyDrivers(normalized);
      } catch (error) {
        if (active) {
            console.error("Failed to load nearby drivers", error);
            setNearbyDrivers([]);
        }
      } finally {
        if (active) setLoadingDrivers(false);
      }
    };

    loadNearbyDrivers();
    return () => { active = false; };
  }, [coordinateKey]);

  const selectedDriver = useMemo(
    () => nearbyDrivers.find((item) => item.driver?.id === selectedDriverId) || null,
    [nearbyDrivers, selectedDriverId]
  );

  const fareStartingAt = useMemo(() => {
    if (!nearbyDrivers.length) return null;
    return nearbyDrivers.reduce((lowest, item) => {
      const nextValue = Number(item.driver?.vehicle?.base_fare);
      if (!Number.isFinite(nextValue)) return lowest;
      if (lowest === null || nextValue < lowest) return nextValue;
      return lowest;
    }, null);
  }, [nearbyDrivers]);

  const saveToCustomerAccount = async (rideResponse) => {
    const assignedDriver = rideResponse?.assigned_driver;
    const rideRequest = rideResponse?.ride_request;

    await bookingService.createRequest({
      service_type: "cab",
      title: `Cab ride: ${form.pickup} → ${form.drop}`,
      summary: `${form.passengers} passenger(s) · ${formatShortDate(form.travelDate)}`,
      total_amount: rideRequest?.estimated_fare || null,
      metadata: {
        pickup: form.pickup,
        drop: form.drop,
        travel_date: form.travelDate,
        passengers: form.passengers,
        notes: form.notes || null,
        ride_request_id: rideRequest?.id || null,
        estimated_fare: rideRequest?.estimated_fare || null,
        commission_amount: rideRequest?.commission_amount || null,
        driver_name: assignedDriver?.full_name || null,
        driver_phone: assignedDriver?.phone || null,
        vehicle_name: assignedDriver?.vehicle?.vehicle_name || null,
        plate_number: assignedDriver?.vehicle?.plate_number || null,
        source: "mobility_marketplace",
      },
    });
  };

  const submitInterest = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }

    if (!form.pickup.trim() || !form.drop.trim()) {
      toast.error("Add both pickup and drop locations.");
      return;
    }

    setSubmitting(true);
    try {
      const rideResponse = await mobilityService.createRideRequest({
        selected_driver_id: selectedDriverId || null,
        customer_user_id: user?.id ? String(user.id) : null,
        customer_name: user?.username || user?.email || null,
        customer_email: user?.email || null,
        customer_phone: user?.mobile || null,
        pickup_label: form.pickup,
        drop_label: form.drop,
        pickup_latitude: coordinates?.latitude ?? null,
        pickup_longitude: coordinates?.longitude ?? null,
        passengers: form.passengers,
        notes: `Travel date: ${form.travelDate}${form.notes ? ` | ${form.notes}` : ""}`,
        source: "customer_app",
      });

      setConfirmedRide(rideResponse);

      try {
        await saveToCustomerAccount(rideResponse);
      } catch (accountError) {
        console.error("Ride created but account sync failed", accountError);
      }

      if (rideResponse?.assigned_driver?.full_name) {
        toast.success(`Driver matched: ${rideResponse.assigned_driver.full_name}`);
      } else {
        toast.success("Ride request saved. We will assign the nearest active driver.");
      }
      navigate("/activity");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not confirm the cab request.");
    } finally {
      setSubmitting(false);
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
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-[80vh] bg-white rounded-[32px] sm:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden mb-12 flex flex-col pt-6 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
      
      {/* Hero Header */}
      <motion.section 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 relative"
      >
        <div className="bg-white rounded-[32px] md:rounded-[40px] p-8 md:p-14 lg:p-16 border-2 border-orange-50 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
             <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[60%] bg-gradient-to-bl from-orange-200/50 via-orange-100/30 to-transparent rounded-full blur-3xl mix-blend-multiply" />
             <div className="absolute bottom-[-10%] left-[-5%] w-[50%] h-[50%] bg-gradient-to-tr from-yellow-200/40 via-orange-50/20 to-transparent rounded-full blur-3xl mix-blend-multiply" />
          </div>

          {/* Floating Icons */}
          <div className="absolute inset-0 pointer-events-none hidden md:block">
            <motion.div 
              animate={{ y: [0, -15, 0], x: [0, 10, 0], rotate: [0, 5, 0] }} 
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[10%] right-[15%] text-orange-200 opacity-60 drop-shadow-xl"
            >
              <MdOutlineLocalTaxi className="w-24 h-24 rotate-12" />
            </motion.div>
            <motion.div 
              animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }} 
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-[20%] right-[5%] text-yellow-200 opacity-50 drop-shadow-lg"
            >
              <MdOutlineRoute className="w-16 h-16" />
            </motion.div>
            <motion.div 
              animate={{ y: [0, -10, 0], x: [0, -10, 0] }} 
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute top-[30%] left-[8%] text-slate-200 opacity-40 drop-shadow-md"
            >
              <MdOutlineDirectionsCar className="w-12 h-12 -rotate-12" />
            </motion.div>
          </div>
          
          <div className="relative z-10 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 border border-orange-100 px-5 py-2 rounded-full text-xs font-bold tracking-[0.2em] uppercase mb-6 shadow-sm">
                <FaCarSide className="animate-bounce" /> Smart Mobility
              </span>
            </motion.div>

            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.05] text-slate-800 mb-6 drop-shadow-sm"
            >
              Every route, <br className="hidden md:block"/> 
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-500">reimagined.</span>
            </motion.h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-slate-500 text-lg md:text-xl leading-relaxed max-w-xl mb-12"
            >
              Connect with the nearest verified drivers in real-time. Transparent fares, direct contact, and zero subscription fees.
            </motion.p>


          </div>
        </div>
      </motion.section>

      <div className="max-w-3xl mx-auto w-full pb-10">
        
        {/* Left Side: Booking Form */}
        <section className="bg-gray-50/50 border border-gray-100 rounded-[32px] p-8">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shadow-sm shadow-orange-500/10">
              <MdOutlineDirectionsCar className="text-2xl" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-orange-600 font-bold mb-0.5">Customer Dispatch</p>
              <h3 className="text-2xl font-extrabold text-gray-900">Request your ride</h3>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Pickup Location" icon={FiMapPin}>
                <div className="relative">
                  <input 
                    type="text" 
                    value={form.pickup} 
                    onChange={e => setField("pickup", e.target.value)} 
                    placeholder="Search pickup point" 
                    className={inputStyle} 
                  />
                  <FiMapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
                </div>
              </FormField>

              <FormField label="Drop Destination" icon={FiNavigation}>
                <div className="relative">
                  <input 
                    type="text" 
                    value={form.drop} 
                    onChange={e => setField("drop", e.target.value)} 
                    placeholder="Search destination" 
                    className={inputStyle} 
                  />
                  <FiNavigation className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
                </div>
              </FormField>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField label="Travel Date" icon={FiCalendar}>
                <input 
                  type="date" 
                  value={form.travelDate} 
                  onChange={e => setField("travelDate", e.target.value)} 
                  className={inputStyle} 
                />
              </FormField>
              <FormField label="Passengers" icon={FiUsers}>
                <input 
                  type="number" 
                  min={1} 
                  max={12} 
                  value={form.passengers} 
                  onChange={e => setField("passengers", Number(e.target.value) || 1)} 
                  className={inputStyle} 
                />
              </FormField>
            </div>

            <FormField label="Trip Notes" icon={FiInfo}>
              <textarea 
                value={form.notes} 
                onChange={e => setField("notes", e.target.value)} 
                placeholder="Luggage count, gate number, or special requests..." 
                rows={3} 
                className={`${inputStyle} resize-none`} 
              />
            </FormField>

            <div className="flex flex-wrap gap-3 py-2">
              <LocationPicker tone="orange" />
            </div>

            <AnimatePresence>
              {confirmedRide?.assigned_driver && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="bg-green-50 border border-green-100 rounded-3xl p-6 mt-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-green-600 mb-3">
                         <FiCheckCircle className="text-lg" />
                         <span className="text-[10px] font-bold uppercase tracking-widest">Matched with Driver</span>
                      </div>
                      <h4 className="text-2xl font-black text-gray-900">{confirmedRide.assigned_driver.full_name}</h4>
                      <p className="text-sm font-bold text-gray-500 mt-1">
                        {confirmedRide.assigned_driver.vehicle?.vehicle_name} · <span className="text-indigo-600">{confirmedRide.assigned_driver.vehicle?.plate_number}</span>
                      </p>
                      <p className="text-xs font-bold text-green-700 mt-2 bg-green-100 w-fit px-3 py-1 rounded-full">
                        Estimated Fare: {formatCurrency(confirmedRide.ride_request?.estimated_fare)}
                      </p>
                    </div>
                    <a 
                      href={`tel:${confirmedRide.assigned_driver.phone}`}
                      className="inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-gray-900 px-6 py-4 font-bold text-white no-underline shadow-lg transition-all hover:bg-black focus:outline-none focus:ring-4 focus:ring-gray-900/10"
                      style={{ color: "#ffffff" }}
                      aria-label={`Call driver ${confirmedRide.assigned_driver.full_name}`}
                    >
                      <FiPhone className="text-white" />
                      <span className="text-white">Call Driver</span>
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              onClick={submitInterest}
              disabled={submitting}
              className={`w-full h-16 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-3 shadow-xl ${
                submitting 
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                  : "bg-gray-900 text-white hover:bg-black shadow-gray-900/10 active:scale-95"
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                  Confirming ride...
                </>
              ) : (
                <>
                  {isAuthenticated ? "Book Your Ride" : "Sign in to request"}
                  <FiArrowRight className="text-xl" />
                </>
              )}
            </button>
          </div>
        </section>


      </div>
    </div>
  );
};

export default CabsPage;
