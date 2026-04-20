import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CarFront,
  CheckCircle2,
  Clock3,
  Gauge,
  MapPin,
  Navigation,
  Phone,
  Route,
  ShieldCheck,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import useCustomerLocation from "../hooks/useCustomerLocation";
import { formatCurrency, formatDistance, formatShortDate, todayDate } from "../lib/format";
import bookingService from "../services/bookingService";
import mobilityService from "../services/mobilityService";

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
                limit: 6,
              }
            : { limit: 6 }
        );

        if (!active) return;
        const normalized = Array.isArray(data) ? data : [];
        setNearbyDrivers(normalized);
        setSelectedDriverId((current) =>
          current && normalized.some((item) => item.driver?.id === current) ? current : null
        );
      } catch (error) {
        if (!active) return;
        console.error("Failed to load nearby drivers", error);
        setNearbyDrivers([]);
      } finally {
        if (active) {
          setLoadingDrivers(false);
        }
      }
    };

    loadNearbyDrivers();
    return () => {
      active = false;
    };
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
      title: `Cab ride from ${form.pickup} to ${form.drop}`,
      summary: `${form.passengers} passenger(s) on ${formatShortDate(form.travelDate)}`,
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

    if (!form.pickup || !form.drop) {
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

  return (
    <div className="space-y-10">
      <section className="glass-panel rounded-[38px] px-6 py-8 sm:px-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[#c15d1f]">Cab lane</p>
        <h1 className="font-display mt-3 text-6xl leading-none text-[#1f1812]">
          Nearby cabs, live drivers, direct contact
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#68584b]">
          Zahi Trips now shows online drivers from the new mobility service. Customers can see the
          nearest available cab, confirm a paid ride, and reach the driver directly, while Zahi
          keeps only a commission from the customer payment.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="soft-card rounded-[34px] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f1812] text-white">
              <CarFront className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Customer flow</p>
              <h2 className="font-display text-4xl leading-none text-[#1f1812]">
                Book the nearest online cab
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[24px] bg-[#fbf2e7] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Online drivers</p>
              <p className="mt-2 text-3xl font-semibold text-[#1f1812]">{nearbyDrivers.length}</p>
            </div>
            <div className="rounded-[24px] bg-[#fbf2e7] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Fare starts at</p>
              <p className="mt-2 text-3xl font-semibold text-[#1f1812]">
                {fareStartingAt !== null ? formatCurrency(fareStartingAt) : "Waiting"}
              </p>
            </div>
            <div className="rounded-[24px] bg-[#fbf2e7] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Platform model</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-[#1f1812]">
                No driver subscription. Zahi takes 12% only when riders pay.
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            {locationStatus === "ready" && locationLabel ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f5e4d2] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8e4a1d]">
                <Navigation className="h-3.5 w-3.5" />
                Ranked around {locationLabel}
              </span>
            ) : (
              <button
                type="button"
                onClick={requestLocation}
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(198,99,44,0.22)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8e4a1d] transition hover:bg-[#fff8f1]"
              >
                <MapPin className="h-3.5 w-3.5" />
                Enable nearby ranking
              </button>
            )}

            <a
              href={driverAppUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-[rgba(31,24,18,0.12)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#1f1812]"
            >
              Open Zahi Drive
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#3f342a]">
                <MapPin className="h-4 w-4" />
                Pickup
              </span>
              <input
                type="text"
                value={form.pickup}
                onChange={(event) => setField("pickup", event.target.value)}
                placeholder="Airport, hotel, or landmark"
                className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#d66a2f]"
              />
            </label>

            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#3f342a]">
                <Route className="h-4 w-4" />
                Drop
              </span>
              <input
                type="text"
                value={form.drop}
                onChange={(event) => setField("drop", event.target.value)}
                placeholder="Destination address"
                className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#d66a2f]"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#3f342a]">Travel date</span>
                <input
                  type="date"
                  value={form.travelDate}
                  onChange={(event) => setField("travelDate", event.target.value)}
                  className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#d66a2f]"
                />
              </label>
              <label className="block">
                <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#3f342a]">
                  <Users className="h-4 w-4" />
                  Passengers
                </span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={form.passengers}
                  onChange={(event) => setField("passengers", Number(event.target.value) || 1)}
                  className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#d66a2f]"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[#3f342a]">
                Trip note for driver
              </span>
              <textarea
                value={form.notes}
                onChange={(event) => setField("notes", event.target.value)}
                placeholder="Airport gate, luggage count, or landmark"
                rows={3}
                className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#d66a2f]"
              />
            </label>
          </div>

          {!user?.mobile && isAuthenticated ? (
            <div className="mt-5 rounded-[24px] border border-[rgba(198,99,44,0.16)] bg-[#fff4ea] px-4 py-4 text-sm leading-7 text-[#7a4a28]">
              Your customer profile does not have a mobile number yet, so the driver may only see
              your name and email.
            </div>
          ) : null}

          {confirmedRide?.assigned_driver ? (
            <div className="mt-5 rounded-[28px] border border-[rgba(46,125,103,0.16)] bg-[#f3fbf7] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#2e7d67]">
                    <CheckCircle2 className="h-4 w-4" />
                    Ride confirmed
                  </p>
                  <h3 className="mt-3 text-2xl font-semibold text-[#1f1812]">
                    {confirmedRide.assigned_driver.full_name}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[#5a4d43]">
                    {confirmedRide.assigned_driver.vehicle?.vehicle_name || "Cab"} ·{" "}
                    {confirmedRide.assigned_driver.vehicle?.plate_number || "Plate pending"}
                  </p>
                  <p className="text-sm leading-7 text-[#5a4d43]">
                    Estimated fare {formatCurrency(confirmedRide.ride_request?.estimated_fare)}
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:items-end">
                  <a
                    href={`tel:${confirmedRide.assigned_driver.phone}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1f1812] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <Phone className="h-4 w-4" />
                    Call driver
                  </a>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#6b8c82]">
                    Zahi commission {formatCurrency(confirmedRide.ride_request?.commission_amount)}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={submitInterest}
            disabled={submitting}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#1f1812] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting
              ? "Confirming ride..."
              : isAuthenticated
                ? "Confirm paid ride"
                : "Sign in to request"}
          </button>
        </section>

        <section className="soft-card rounded-[34px] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Nearby online drivers</p>

          <div className="mt-5 rounded-[24px] border border-[rgba(96,73,53,0.12)] bg-[#fffdf9] p-4">
            <button
              type="button"
              onClick={() => setSelectedDriverId(null)}
              className={`w-full rounded-[20px] px-4 py-4 text-left transition ${
                selectedDriverId === null
                  ? "bg-[#1f1812] text-white"
                  : "bg-[#fbf2e7] text-[#1f1812]"
              }`}
            >
              <p
                className={`text-xs uppercase tracking-[0.18em] ${
                  selectedDriverId === null ? "text-white/70" : "text-[#7a6453]"
                }`}
              >
                Auto assignment
              </p>
              <p className="mt-2 text-lg font-semibold">Let Zahi pick the nearest online cab</p>
              <p
                className={`mt-2 text-sm leading-7 ${
                  selectedDriverId === null ? "text-white/80" : "text-[#5f4d41]"
                }`}
              >
                Best if you just want the fastest available match around your pickup point.
              </p>
            </button>
          </div>

          <div className="mt-4 space-y-3 text-sm leading-7 text-[#68584b]">
            {loadingDrivers ? (
              [...Array(3)].map((_, index) => (
                <div key={index} className="h-36 animate-pulse rounded-[24px] bg-[#fbf2e7]" />
              ))
            ) : nearbyDrivers.length === 0 ? (
              <div className="rounded-[24px] bg-[#fbf2e7] px-4 py-4">
                No drivers are online right now. Your ride request can still be saved and assigned
                when the next driver goes online.
              </div>
            ) : (
              nearbyDrivers.map((item) => {
                const driver = item.driver || {};
                const vehicle = driver.vehicle || {};
                const isSelected = selectedDriverId === driver.id;

                return (
                  <button
                    key={driver.id}
                    type="button"
                    onClick={() => setSelectedDriverId(driver.id)}
                    className={`w-full rounded-[26px] border p-4 text-left transition ${
                      isSelected
                        ? "border-[rgba(214,106,47,0.26)] bg-[#fff2e8]"
                        : "border-[rgba(96,73,53,0.12)] bg-[#fffdf9]"
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-[#1f1812]">{driver.full_name}</p>
                          <span className="rounded-full bg-[#eef7f2] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2e7d67]">
                            Online
                          </span>
                          {item.distance_km !== null && item.distance_km !== undefined ? (
                            <span className="rounded-full bg-[#f5e4d2] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8e4a1d]">
                              {formatDistance(item.distance_km)}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-sm leading-7 text-[#5a4d43]">
                          {vehicle.vehicle_name || "Cab"} · {vehicle.plate_number || "Plate pending"}
                        </p>
                        <p className="text-sm leading-7 text-[#5a4d43]">
                          {driver.current_area_label || "Current area updating"}
                        </p>
                      </div>

                      <div className="space-y-2 text-sm text-[#5a4d43] sm:text-right">
                        <p className="inline-flex items-center gap-2 sm:justify-end">
                          <Gauge className="h-4 w-4" />
                          Starts at {formatCurrency(vehicle.base_fare || 0)}
                        </p>
                        <p className="inline-flex items-center gap-2 sm:justify-end">
                          <Clock3 className="h-4 w-4" />
                          {formatCurrency(vehicle.per_km_rate || 0)} / km
                        </p>
                        <p className="inline-flex items-center gap-2 sm:justify-end">
                          <Phone className="h-4 w-4" />
                          {item.contact_phone || "Phone pending"}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-5 rounded-[24px] bg-[#fbf2e7] px-4 py-4 text-sm leading-7 text-[#68584b]">
            Only drivers who are online in Zahi Drive are shown here. Driver subscriptions are not
            charged; the platform earns only from customer-side commission on paid rides.
          </div>

          {selectedDriver ? (
            <div className="mt-5 rounded-[24px] border border-[rgba(46,125,103,0.14)] bg-[#f3fbf7] px-4 py-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2e7d67]">
                <ShieldCheck className="h-4 w-4" />
                Selected driver
              </p>
              <p className="mt-2 text-lg font-semibold text-[#1f1812]">{selectedDriver.driver.full_name}</p>
              <p className="mt-1 text-sm leading-7 text-[#5a4d43]">
                {selectedDriver.driver.vehicle?.vehicle_name || "Cab"} ·{" "}
                {selectedDriver.driver.vehicle?.plate_number || "Plate pending"}
              </p>
              <a
                href={`tel:${selectedDriver.contact_phone}`}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#1f1812] shadow-sm"
              >
                <Phone className="h-4 w-4" />
                Call this driver
              </a>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
};

export default CabsPage;
