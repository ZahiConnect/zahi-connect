import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiCreditCard,
  FiInfo,
  FiMapPin,
  FiNavigation,
  FiPhone,
  FiStar,
  FiShield,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import {
  MdOutlineDirectionsCar,
  MdOutlineLocalTaxi,
  MdOutlineRoute,
  MdOutlineSpeed,
} from "react-icons/md";
import { FaCarSide } from "react-icons/fa";
import toast from "react-hot-toast";

import PlaceAutocompleteInput from "../components/PlaceAutocompleteInput";
import { useAuth } from "../context/AuthContext";
import useCustomerLocation from "../hooks/useCustomerLocation";
import {
  calculateDistanceKm,
  formatCurrency,
  formatDistance,
  formatShortDate,
  todayDate,
} from "../lib/format";
import {
  CAB_TIER_OPTIONS,
  buildPassengerOptions,
  clampPassengerCountForTier,
  getCabTier,
} from "../lib/cabTiers";
import { loadRazorpayScript } from "../lib/razorpay";
import bookingService from "../services/bookingService";
import mobilityService from "../services/mobilityService";

const DRIVER_SEARCH_RADIUS_KM = 30;
const inputStyle =
  "w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-sm text-gray-900 outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10";

const coordinatesFromSuggestion = (suggestion) => {
  const latitude = Number(suggestion?.latitude);
  const longitude = Number(suggestion?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

const coordinateKeyFrom = (coordinates) => {
  if (!coordinates) return "missing";
  return `${Number(coordinates.latitude).toFixed(5)}:${Number(coordinates.longitude).toFixed(5)}`;
};

const sortNearbyDrivers = (items = []) =>
  [...items].sort((a, b) => {
    const distanceA = Number.isFinite(Number(a?.distance_km)) ? Number(a.distance_km) : 999999;
    const distanceB = Number.isFinite(Number(b?.distance_km)) ? Number(b.distance_km) : 999999;
    if (distanceA !== distanceB) return distanceA - distanceB;

    const ratingA = Number.isFinite(Number(a?.driver?.rating)) ? Number(a.driver.rating) : 0;
    const ratingB = Number.isFinite(Number(b?.driver?.rating)) ? Number(b.driver.rating) : 0;
    return ratingB - ratingA;
  });

const formatTripDistance = (value) => {
  const distance = Number(value);
  if (!Number.isFinite(distance)) return "Select route";
  return `${distance.toFixed(distance < 10 ? 2 : 1)} km`;
};

const FormField = ({ label, icon: Icon, children }) => (
  <label className="block">
    <span className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
      {Icon ? <Icon className="text-orange-500" /> : null}
      {label}
    </span>
    {children}
  </label>
);

const CabsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { coordinates, locationLabel } = useCustomerLocation(true);
  const lastLocationPickupRef = useRef("");

  const [form, setForm] = useState({
    pickup: "",
    drop: "",
    travelDate: todayDate(),
    passengers: 1,
    notes: "",
  });
  const [selectedTierKey, setSelectedTierKey] = useState("tier_1");
  const [selectedPickupPlace, setSelectedPickupPlace] = useState(null);
  const [selectedDropPlace, setSelectedDropPlace] = useState(null);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [selectedDriverId, setSelectedDriverId] = useState(null);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [paying, setPaying] = useState(false);

  const selectedTier = useMemo(
    () => TIER_OPTIONS.find((tier) => tier.key === selectedTierKey) || TIER_OPTIONS[0],
    [selectedTierKey]
  );

  const pickupCoordinates = selectedPickupPlace || coordinates;
  const pickupCoordinateKey = coordinateKeyFrom(pickupCoordinates);
  const selectedDriver = useMemo(
    () => nearbyDrivers.find((item) => item?.driver?.id === selectedDriverId) || nearbyDrivers[0] || null,
    [nearbyDrivers, selectedDriverId]
  );

  const tripDistanceKm = useMemo(
    () => calculateDistanceKm(pickupCoordinates, selectedDropPlace),
    [pickupCoordinates, selectedDropPlace]
  );

  const billableDistanceKm = useMemo(
    () => (Number.isFinite(tripDistanceKm) ? Math.max(1, tripDistanceKm) : null),
    [tripDistanceKm]
  );

  const estimatedFare = useMemo(() => {
    if (!Number.isFinite(billableDistanceKm)) return null;
    return Math.ceil(billableDistanceKm * selectedTier.perKmRate);
  }, [billableDistanceKm, selectedTier.perKmRate]);

  const actionLabel = useMemo(() => {
    if (loadingDrivers) return "Finding nearby drivers...";
    if (paying) return "Processing payment...";
    if (!isAuthenticated) return "Sign in to pay";
    if (!estimatedFare) return "Calculate Fare & Pay";
    return `Pay ${formatCurrency(estimatedFare)} & Request Ride`;
  }, [estimatedFare, isAuthenticated, loadingDrivers, paying]);

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handlePickupChange = (value) => {
    setSelectedPickupPlace(null);
    setField("pickup", value);
  };

  const handleDropChange = (value) => {
    setSelectedDropPlace(null);
    setField("drop", value);
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
      if (!pickupCoordinates) {
        setNearbyDrivers([]);
        setSelectedDriverId(null);
        return;
      }

      setLoadingDrivers(true);
      try {
        const data = await mobilityService.getNearbyDrivers({
          latitude: pickupCoordinates.latitude,
          longitude: pickupCoordinates.longitude,
          radius_km: DRIVER_SEARCH_RADIUS_KM,
          limit: 20,
        });
        if (!active) return;

        const rankedDrivers = sortNearbyDrivers(Array.isArray(data) ? data : []);
        setNearbyDrivers(rankedDrivers);
        setSelectedDriverId((current) => {
          if (current && rankedDrivers.some((item) => item?.driver?.id === current)) {
            return current;
          }
          return rankedDrivers[0]?.driver?.id || null;
        });
      } catch (error) {
        console.error("Failed to load nearby cab count", error);
        if (active) {
          setNearbyDrivers([]);
          setSelectedDriverId(null);
        }
      } finally {
        if (active) setLoadingDrivers(false);
      }
    };

    loadNearbyDrivers();
    return () => {
      active = false;
    };
  }, [pickupCoordinateKey]);

  const ensureReadyForPayment = () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return false;
    }

    if (!form.pickup.trim() || !form.drop.trim()) {
      toast.error("Add pickup and destination.");
      return false;
    }

    if (!pickupCoordinates || !selectedDropPlace) {
      toast.error("Select pickup and destination from suggestions so distance can be calculated.");
      return false;
    }

    if (!estimatedFare || estimatedFare <= 0) {
      toast.error("Could not calculate the cab fare.");
      return false;
    }

    if (!loadingDrivers && nearbyDrivers.length === 0) {
      toast.error("No nearby drivers are available right now. Try another pickup area.");
      return false;
    }

    return true;
  };

  const buildCabMetadata = (extra = {}) => ({
    pickup: form.pickup,
    drop: form.drop,
    travel_date: form.travelDate,
    passengers: form.passengers,
    notes: form.notes || null,
    pickup_latitude: pickupCoordinates?.latitude ?? null,
    pickup_longitude: pickupCoordinates?.longitude ?? null,
    drop_latitude: selectedDropPlace?.latitude ?? null,
    drop_longitude: selectedDropPlace?.longitude ?? null,
    trip_distance_km: tripDistanceKm,
    billable_distance_km: billableDistanceKm,
    tier_key: selectedTier.key,
    tier_label: selectedTier.label,
    tier_per_km_rate: selectedTier.perKmRate,
    tier_fare: selectedTier.perKmRate,
    estimated_fare: estimatedFare,
    requested_driver_id: selectedDriver?.driver?.id || null,
    requested_driver_name: selectedDriver?.driver?.full_name || null,
    requested_driver_distance_km: selectedDriver?.distance_km ?? null,
    ride_status: "payment_pending",
    source: "mobility_marketplace",
    ...extra,
  });

  const createDriverRequest = async (bookingRecord) => {
    const customerUserId = bookingRecord?.user_id ? String(bookingRecord.user_id) : user?.id ? String(user.id) : null;
    const preferredDriver =
      (nearbyDrivers.find((item) => item?.driver?.id === selectedDriverId) || nearbyDrivers[0])
        ?.driver || null;
    const requestPayload = {
      booking_request_id: bookingRecord?.id ? String(bookingRecord.id) : null,
      selected_driver_id: preferredDriver?.id || null,
      customer_user_id: customerUserId,
      customer_name: bookingRecord?.user_name || user?.username || user?.email || null,
      customer_email: bookingRecord?.user_email || user?.email || null,
      customer_phone: user?.mobile || null,
      pickup_label: form.pickup,
      drop_label: form.drop,
      pickup_latitude: pickupCoordinates?.latitude ?? null,
      pickup_longitude: pickupCoordinates?.longitude ?? null,
      drop_latitude: selectedDropPlace?.latitude ?? null,
      drop_longitude: selectedDropPlace?.longitude ?? null,
      passengers: form.passengers,
      tier_key: selectedTier.key,
      tier_label: selectedTier.label,
      tier_fare: selectedTier.perKmRate,
      trip_distance_km: tripDistanceKm,
      estimated_fare: estimatedFare,
      notes: `Paid cab request | Travel date: ${form.travelDate}${form.notes ? ` | ${form.notes}` : ""}`,
      source: "customer_app",
    };

    try {
      return await mobilityService.createRideRequest(requestPayload);
    } catch (error) {
      const detail = String(error.response?.data?.detail || "");
      const canRetryWithoutSelectedDriver =
        requestPayload.selected_driver_id &&
        (error.response?.status === 404 ||
          detail.toLowerCase().includes("selected driver") ||
          detail.toLowerCase().includes("another driver"));

      if (!canRetryWithoutSelectedDriver) {
        throw error;
      }

      return mobilityService.createRideRequest({
        ...requestPayload,
        selected_driver_id: null,
        notes: `${requestPayload.notes} | Preferred driver unavailable; sent to nearby driver pool.`,
      });
    }
  };

  const startPaymentAndRequest = async () => {
    if (!ensureReadyForPayment()) return;

    setPaying(true);
    try {
      const paymentPayload = {
        service_type: "cab",
        title: `Cab ride: ${form.pickup} to ${form.drop}`,
        summary: `${selectedTier.label} at ${formatCurrency(
          selectedTier.perKmRate
        )}/km on ${formatShortDate(form.travelDate)}`,
        total_amount: estimatedFare,
        currency: "INR",
        metadata: buildCabMetadata(),
      };

      const { payment_order_id, checkout } = await bookingService.createPaymentCheckout(
        paymentPayload
      );
      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded || !window.Razorpay) {
        throw new Error("Razorpay checkout could not be loaded.");
      }

      const razorpay = new window.Razorpay({
        ...checkout,
        theme: { color: "#ea580c" },
        handler: async (response) => {
          const requestToast = toast.loading("Confirming payment and sending cab request...");
          try {
            const bookingRecord = await bookingService.verifyPayment({
              payment_order_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            await createDriverRequest(bookingRecord);
            toast.dismiss(requestToast);
            toast.success("Payment done. Cab request sent to Zahi Driver.");
            navigate("/activity");
          } catch (error) {
            console.error("Cab payment/request failed", error);
            toast.dismiss(requestToast);
            toast.error(
              error.response?.data?.detail ||
                "Payment confirmed, but cab request could not be sent. Please contact support."
            );
            setPaying(false);
          }
        },
        modal: {
          ondismiss: () => setPaying(false),
        },
      });

      razorpay.open();
    } catch (error) {
      console.error("Failed to start cab payment", error);
      toast.error(error.response?.data?.detail || error.message || "Could not start payment.");
      setPaying(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="mx-auto mb-12 flex min-h-[80vh] max-w-7xl flex-col overflow-hidden rounded-[32px] border border-gray-100 bg-white px-4 pb-20 pt-6 shadow-sm sm:rounded-[40px] md:px-8">
      <motion.section
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mb-12"
      >
        <div className="relative overflow-hidden rounded-[32px] border-2 border-orange-50 bg-white p-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)] md:rounded-[40px] md:p-14 lg:p-16">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute right-[-5%] top-[-10%] h-[60%] w-[40%] rounded-full bg-gradient-to-bl from-orange-200/50 via-orange-100/30 to-transparent blur-3xl mix-blend-multiply" />
            <div className="absolute bottom-[-10%] left-[-5%] h-[50%] w-[50%] rounded-full bg-gradient-to-tr from-yellow-200/40 via-orange-50/20 to-transparent blur-3xl mix-blend-multiply" />
          </div>

          <div className="pointer-events-none absolute inset-0 hidden md:block">
            <motion.div
              animate={{ y: [0, -15, 0], x: [0, 10, 0], rotate: [0, 5, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute right-[15%] top-[10%] text-orange-200 opacity-60 drop-shadow-xl"
            >
              <MdOutlineLocalTaxi className="h-24 w-24 rotate-12" />
            </motion.div>
            <motion.div
              animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-[20%] right-[5%] text-yellow-200 opacity-50 drop-shadow-lg"
            >
              <MdOutlineRoute className="h-16 w-16" />
            </motion.div>
            <motion.div
              animate={{ y: [0, -10, 0], x: [0, -10, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute left-[8%] top-[30%] text-slate-200 opacity-40 drop-shadow-md"
            >
              <MdOutlineDirectionsCar className="h-12 w-12 -rotate-12" />
            </motion.div>
          </div>

          <div className="relative z-10 max-w-2xl">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-5 py-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-600 shadow-sm">
                <FaCarSide className="animate-bounce" /> Smart Mobility
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6 text-5xl font-extrabold leading-[1.05] tracking-tight text-slate-800 drop-shadow-sm md:text-6xl lg:text-7xl"
            >
              Every route,
              <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-orange-500 to-yellow-500 bg-clip-text text-transparent">
                reimagined.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-10 max-w-xl text-lg leading-relaxed text-slate-500 md:text-xl"
            >
              Choose your route, see transparent tier pricing, and send a paid cab request
              to verified Zahi drivers nearby.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="grid max-w-xl gap-3 sm:grid-cols-3"
            >
              <div className="rounded-2xl border border-orange-100 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                <FiShield className="mb-2 text-orange-500" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Within 30 km
                </p>
                <p className="mt-1 text-sm font-black text-gray-900">
                  {loadingDrivers
                    ? "Checking"
                    : nearbyDrivers.length
                      ? `${nearbyDrivers.length} nearby`
                      : "No nearby"}
                </p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                <MdOutlineSpeed className="mb-2 text-orange-500" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Distance
                </p>
                <p className="mt-1 text-sm font-black text-gray-900">
                  {formatTripDistance(tripDistanceKm)}
                </p>
              </div>
              <div className="rounded-2xl border border-orange-100 bg-white/80 px-4 py-3 shadow-sm backdrop-blur">
                <FiCreditCard className="mb-2 text-orange-500" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Fare
                </p>
                <p className="mt-1 text-sm font-black text-gray-900">
                  {estimatedFare ? formatCurrency(estimatedFare) : "After route"}
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-3xl pb-10"
      >
        <motion.section
          variants={itemVariants}
          className="rounded-[32px] border border-gray-100 bg-gray-50/50 p-6 sm:p-8"
        >
          <div className="mb-10 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-orange-600 shadow-sm shadow-orange-500/10">
              <MdOutlineDirectionsCar className="text-2xl" />
            </div>
            <div>
              <p className="mb-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-600">
                Customer Dispatch
              </p>
              <h3 className="text-2xl font-extrabold text-gray-900">Request your ride</h3>
            </div>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Pickup Location" icon={FiMapPin}>
                <PlaceAutocompleteInput
                  value={form.pickup}
                  onChange={handlePickupChange}
                  onSelect={(suggestion) =>
                    setSelectedPickupPlace(coordinatesFromSuggestion(suggestion))
                  }
                  placeholder="Search pickup point"
                  className={inputStyle}
                  icon={<FiMapPin size={16} />}
                />
              </FormField>

              <FormField label="Drop Destination" icon={FiNavigation}>
                <PlaceAutocompleteInput
                  value={form.drop}
                  onChange={handleDropChange}
                  onSelect={(suggestion) =>
                    setSelectedDropPlace(coordinatesFromSuggestion(suggestion))
                  }
                  placeholder="Search destination"
                  className={inputStyle}
                  icon={<FiNavigation size={16} />}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Travel Date" icon={FiCalendar}>
                <input
                  type="date"
                  value={form.travelDate}
                  onChange={(event) => setField("travelDate", event.target.value)}
                  className={inputStyle}
                />
              </FormField>

              <FormField label="Passengers" icon={FiUsers}>
                <input
                  type="number"
                  min={1}
                  max={MAX_PASSENGERS}
                  value={form.passengers}
                  onChange={(event) =>
                    setField("passengers", clampPassengerCount(event.target.value))
                  }
                  className={inputStyle}
                />
              </FormField>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                <FiZap className="text-orange-500" />
                Ride Tier
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {TIER_OPTIONS.map((tier) => {
                  const selected = tier.key === selectedTierKey;
                  return (
                    <button
                      key={tier.key}
                      type="button"
                      onClick={() => setSelectedTierKey(tier.key)}
                      className={`rounded-2xl border p-4 text-left transition-all ${
                        selected
                          ? "border-orange-300 bg-orange-50 shadow-lg shadow-orange-500/10"
                          : "border-gray-200 bg-white hover:border-orange-200 hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-black text-gray-900">{tier.label}</span>
                        {selected ? <FiCheckCircle className="text-orange-600" /> : null}
                      </div>
                      <p className="mt-2 text-2xl font-black text-gray-900">
                        {formatCurrency(tier.perKmRate)}
                        <span className="ml-1 text-xs font-bold text-gray-400">/km</span>
                      </p>
                      <p className="mt-1 text-xs font-semibold text-gray-500">
                        {tier.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <FormField label="Trip Notes" icon={FiInfo}>
              <textarea
                value={form.notes}
                onChange={(event) => setField("notes", event.target.value)}
                placeholder="Luggage count, gate number, or special requests..."
                rows={3}
                className={`${inputStyle} resize-none`}
              />
            </FormField>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  <FiShield className="text-orange-500" />
                  Nearby drivers
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-orange-500">
                  Nearest first
                </span>
              </div>

              <div className="rounded-3xl border border-orange-100 bg-white p-4 shadow-sm">
                {loadingDrivers ? (
                  <div className="flex items-center justify-center gap-3 py-8 text-sm font-bold text-gray-400">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-orange-200 border-t-orange-500" />
                    Finding nearby drivers...
                  </div>
                ) : nearbyDrivers.length ? (
                  <div className="grid gap-3">
                    {nearbyDrivers.slice(0, 5).map((item, index) => {
                      const driver = item.driver || {};
                      const selected = (selectedDriver?.driver?.id || selectedDriver?.id) === driver.id;
                      const vehicle = driver.vehicle || {};

                      return (
                        <button
                          key={driver.id || index}
                          type="button"
                          onClick={() => setSelectedDriverId(driver.id)}
                          className={`w-full rounded-2xl border p-4 text-left transition-all ${
                            selected
                              ? "border-orange-300 bg-orange-50 shadow-lg shadow-orange-500/10"
                              : "border-gray-100 bg-gray-50 hover:border-orange-200 hover:bg-white"
                          }`}
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 gap-3">
                              {vehicle.photo_url ? (
                                <img
                                  src={vehicle.photo_url}
                                  alt={vehicle.vehicle_name || "Cab"}
                                  className="h-14 w-14 rounded-2xl object-cover"
                                />
                              ) : (
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                                  <MdOutlineLocalTaxi className="text-2xl" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-black text-gray-900">
                                    {driver.full_name || "Zahi Driver"}
                                  </p>
                                  {index === 0 ? (
                                    <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-green-700">
                                      Nearest
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 truncate text-xs font-semibold text-gray-500">
                                  {[vehicle.vehicle_name, vehicle.vehicle_type, vehicle.plate_number]
                                    .filter(Boolean)
                                    .join(" - ") || "Cab details available after acceptance"}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-gray-500">
                                  <span className="inline-flex items-center gap-1">
                                    <FiMapPin className="text-orange-500" />
                                    {formatDistance(item.distance_km)}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <FiStar className="text-orange-500" />
                                    {Number(driver.rating || 0).toFixed(1)}
                                  </span>
                                  {item.contact_phone ? (
                                    <span className="inline-flex items-center gap-1">
                                      <FiPhone className="text-orange-500" />
                                      Phone shared after accept
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${
                              selected ? "bg-orange-600 text-white" : "bg-white text-gray-500"
                            }`}>
                              Rank #{index + 1}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-gray-50 px-4 py-8 text-center">
                    <MdOutlineLocalTaxi className="mx-auto mb-3 text-3xl text-gray-300" />
                    <p className="text-sm font-black text-gray-700">No nearby drivers found</p>
                    <p className="mt-1 text-xs font-semibold text-gray-400">
                      Choose another pickup location to search within 30 km.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Distance
                  </p>
                  <p className="mt-1 text-lg font-black text-gray-900">
                    {formatTripDistance(tripDistanceKm)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Rate
                  </p>
                  <p className="mt-1 text-lg font-black text-gray-900">
                    {formatCurrency(selectedTier.perKmRate)}/km
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-orange-600">
                    Payable
                  </p>
                  <p className="mt-1 text-2xl font-black text-gray-900">
                    {estimatedFare ? formatCurrency(estimatedFare) : "--"}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs font-semibold leading-5 text-gray-500">
                Driver details are shown in Activity after payment and driver acceptance. Minimum
                billing distance is 1 km. Your money is refunded if no vehicle is available.
              </p>
            </div>

            <button
              type="button"
              onClick={startPaymentAndRequest}
              disabled={paying || loadingDrivers}
              className={`flex h-16 w-full items-center justify-center gap-3 rounded-2xl text-lg font-black shadow-xl transition-all ${
                paying || loadingDrivers
                  ? "cursor-not-allowed bg-gray-100 text-gray-400"
                  : "bg-gray-900 text-white shadow-gray-900/10 hover:bg-black active:scale-95"
              }`}
            >
              {paying || loadingDrivers ? (
                <>
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                  {actionLabel}
                </>
              ) : (
                <>
                  {actionLabel}
                  {isAuthenticated ? (
                    <FiCreditCard className="text-xl" />
                  ) : (
                    <FiArrowRight className="text-xl" />
                  )}
                </>
              )}
            </button>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
};

export default CabsPage;
