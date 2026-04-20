import { useEffect, useMemo, useState } from "react";
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
import { FaCarSide, FaMapMarkedAlt } from "react-icons/fa";
import toast from "react-hot-toast";

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
    status: locationStatus,
    requestLocation,
  } = useCustomerLocation(true);
  
  const coordinateKey = coordinates
    ? `${coordinates.latitude.toFixed(5)}:${coordinates.longitude.toFixed(5)}`
    : "no-location";
    
  const driverAppUrl = import.meta.env.VITE_DRIVER_APP_URL || "http://localhost:5175";

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
    setForm((current) => (current.pickup ? current : { ...current, pickup: locationLabel }));
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
        className="mb-10 bg-gray-900 rounded-[32px] p-8 md:p-12 lg:p-16 text-white relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <MdOutlineLocalTaxi className="text-[240px]" />
        </div>
        
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 border border-orange-500/20 px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase mb-6">
            <FaCarSide className="text-sm" /> Smart Mobility
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6">
            Every route, <span className="text-orange-400">reimagined.</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-xl mb-8">
            Connect with the nearest verified drivers in real-time. Transparent fares, direct contact, and zero subscription fees.
          </p>

          <div className="flex flex-wrap gap-4 pt-6 border-t border-white/10">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Online Drivers</p>
              <p className="text-2xl font-bold">{nearbyDrivers.length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Starting From</p>
              <p className="text-2xl font-bold">{fareStartingAt !== null ? formatCurrency(fareStartingAt) : "Waiting"}</p>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10 items-start">
        
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
              {locationStatus === "ready" && locationLabel ? (
                <div className="bg-orange-50 text-orange-600 border border-orange-100 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                  <FaMapMarkedAlt /> Near {locationLabel}
                </div>
              ) : (
                <button 
                  onClick={requestLocation} 
                  className="bg-white border border-gray-200 hover:border-orange-200 text-gray-600 hover:text-orange-600 px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm"
                >
                  <FiMapPin /> Enable nearby ranking
                </button>
              )}
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
                      className="bg-gray-900 text-white rounded-2xl px-6 py-4 font-bold flex items-center gap-2 shadow-lg hover:bg-black transition-all"
                    >
                      <FiPhone /> Call Driver
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

        {/* Right Side: Online Drivers */}
        <section className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-orange-600 font-bold mb-0.5">Nearby Online</p>
              <h3 className="text-2xl font-extrabold text-gray-900">Choose your driver</h3>
            </div>
            <div className="bg-green-50 text-green-600 border border-green-100 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest animate-pulse">
              Live Network
            </div>
          </div>

          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
            {/* Auto Assignment Card */}
            <button
               onClick={() => setSelectedDriverId(null)}
               className={`w-full rounded-3xl p-5 text-left border-2 transition-all duration-300 relative group overflow-hidden ${
                 selectedDriverId === null ? "bg-gray-900 border-gray-900 text-white shadow-xl scale-[1.02]" : "bg-gray-50 border-transparent hover:border-gray-200"
               }`}
            >
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <FiZap className="text-[60px]" />
               </div>
               <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${selectedDriverId === null ? "text-orange-400" : "text-gray-400"}`}>
                 Instant Match
               </p>
               <p className="text-lg font-black leading-tight mb-2">Automated Assignment</p>
               <p className={`text-xs font-medium leading-relaxed ${selectedDriverId === null ? "text-gray-400" : "text-gray-500"}`}>
                 Let Zahi pick the nearest high-rated driver instantly.
               </p>
            </button>

            {loadingDrivers ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="h-40 bg-gray-50 rounded-3xl animate-pulse border border-gray-100" />
              ))
            ) : nearbyDrivers.length === 0 ? (
              <div className="py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200 text-center px-6">
                <FiInfo className="text-3xl text-gray-300 mx-auto mb-4" />
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">No active drivers found</p>
                <p className="text-gray-500 text-sm mt-1">We'll save your request and notify the next driver who goes online.</p>
              </div>
            ) : (
                <motion.div 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="space-y-4"
                >
                  {nearbyDrivers.map((item) => {
                    const driver = item.driver || {};
                    const vehicle = driver.vehicle || {};
                    const isSelected = selectedDriverId === driver.id;

                    return (
                      <motion.button
                        key={driver.id}
                        variants={itemVariants}
                        onClick={() => setSelectedDriverId(driver.id)}
                        className={`w-full rounded-3xl p-6 text-left border-2 transition-all duration-300 group relative ${
                          isSelected 
                            ? "bg-orange-50 border-orange-600 shadow-lg scale-[1.01]" 
                            : "bg-white border-gray-100 hover:border-orange-200 hover:shadow-md"
                        }`}
                      >
                         <div className="flex flex-col gap-4">
                           <div className="flex justify-between items-start gap-4">
                             <div className="flex-1">
                               <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <h4 className={`text-lg font-black transition-colors ${isSelected ? "text-orange-950" : "text-gray-900 group-hover:text-orange-600"}`}>
                                    {driver.full_name}
                                  </h4>
                                  <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border border-green-100">
                                    Online
                                  </span>
                               </div>
                               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                 <MdOutlineDirectionsCar className="text-orange-500" /> 
                                 {vehicle.vehicle_name} · <span className={isSelected ? "text-orange-600" : "text-indigo-600"}>{vehicle.plate_number}</span>
                               </p>
                             </div>
                             
                             <div className="text-right">
                               <p className="text-lg font-black text-gray-900">{formatCurrency(vehicle.base_fare || 0)}</p>
                               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Base Fare</p>
                             </div>
                           </div>
                           
                           <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100/50">
                             <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                               <MdOutlineSpeed className="text-orange-400 text-sm" /> {formatCurrency(vehicle.per_km_rate || 0)} / km
                             </div>
                             {item.distance_km != null && (
                               <div className="flex items-center gap-2 text-[10px] font-bold text-orange-600 uppercase tracking-widest">
                                 <FiNavigation className="text-sm" /> {formatDistance(item.distance_km)} away
                               </div>
                             )}
                           </div>

                           <div className="flex items-center gap-2 text-[9px] font-black text-gray-300 group-hover:text-orange-200 transition-colors uppercase tracking-[0.2em] mt-1">
                             <FiMapPin /> {driver.current_area_label || "Last known location..."}
                           </div>
                         </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
            )}
          </div>
          
          <div className="mt-8 bg-gray-50 rounded-2xl p-5 border border-gray-100">
            <p className="text-[10px] font-bold text-gray-400 leading-relaxed uppercase tracking-widest text-center">
              Zahi Mobility operates on a zero-subscription model. We only grow when our partners grow.
            </p>
          </div>

          <AnimatePresence>
            {selectedDriver && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 p-6 bg-gray-900 rounded-[28px] text-white shadow-xl shadow-gray-900/10 border border-gray-800"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-orange-400">
                     <FiShield />
                  </div>
                  <div>
                    <h5 className="font-extrabold text-white text-lg leading-tight">{selectedDriver.driver.full_name}</h5>
                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-widest">Driver Confirmed</p>
                  </div>
                </div>
                <a 
                  href={`tel:${selectedDriver.contact_phone}`}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl py-3.5 px-4 font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <FiPhone /> Call This Driver
                </a>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
};

export default CabsPage;
