import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiAlertCircle,
  FiArrowLeft,
  FiCheckCircle,
  FiImage,
  FiMapPin,
  FiPhone,
  FiStar,
  FiUsers,
  FiX,
} from "react-icons/fi";
import { MdOutlineLocalTaxi } from "react-icons/md";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import { getCabTier } from "../lib/cabTiers";
import { formatCurrency, formatDistance, formatShortDate } from "../lib/format";
import bookingService from "../services/bookingService";
import mobilityService from "../services/mobilityService";

const DRIVER_SEARCH_RADIUS_KM = 30;

const toNumberOrNull = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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

const vehiclePhotosFrom = (vehicle = {}) => {
  const photos = Array.isArray(vehicle.photo_urls) ? vehicle.photo_urls : [];
  return [...new Set([vehicle.photo_url, ...photos].filter(Boolean))];
};

const VehiclePhotoPreview = ({ photos, title, onOpen }) => {
  if (!photos.length) {
    return (
      <div className="mt-4 flex h-28 items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-xs font-black uppercase tracking-widest text-gray-300">
        No vehicle photos
      </div>
    );
  }

  const visiblePhotos = photos.slice(0, 3);
  const hiddenCount = Math.max(photos.length - visiblePhotos.length, 0);
  const gridColumns =
    visiblePhotos.length === 1
      ? "grid-cols-1"
      : visiblePhotos.length === 2
        ? "grid-cols-2"
        : "grid-cols-3";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`mt-4 grid h-32 w-full ${gridColumns} gap-2 overflow-hidden rounded-2xl bg-gray-50 p-1 text-left transition-all hover:ring-4 hover:ring-orange-100`}
      aria-label={`Open vehicle photos for ${title}`}
    >
      {visiblePhotos.map((photo, photoIndex) => (
        <div key={`${photo}-${photoIndex}`} className="relative h-full overflow-hidden rounded-xl bg-gray-100">
          <img
            src={photo}
            alt={`${title} vehicle photo ${photoIndex + 1}`}
            className="h-full w-full object-cover"
          />
          {photoIndex === visiblePhotos.length - 1 && hiddenCount > 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-950/55 text-sm font-black text-white">
              +{hiddenCount}
            </div>
          ) : null}
        </div>
      ))}
    </button>
  );
};

const CabDriverSelectionPage = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [booking, setBooking] = useState(location.state?.booking || null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectingDriverId, setSelectingDriverId] = useState(null);
  const [gallery, setGallery] = useState(null);

  const metadata = booking?.metadata || {};
  const tier = useMemo(() => getCabTier(metadata.tier_key), [metadata.tier_key]);
  const passengers = Number(metadata.passengers) || tier.minPassengers;
  const pickupLatitude = toNumberOrNull(metadata.pickup_latitude);
  const pickupLongitude = toNumberOrNull(metadata.pickup_longitude);

  useEffect(() => {
    let active = true;

    const loadBooking = async () => {
      if (booking?.id === bookingId) return booking;
      const record = await bookingService.getRequest(bookingId);
      if (active) setBooking(record);
      return record;
    };

    const loadDrivers = async () => {
      setLoading(true);
      try {
        const record = await loadBooking();
        const recordMetadata = record?.metadata || {};

        if (recordMetadata.ride_request_id) {
          toast.success("Driver request already created.");
          navigate("/activity", { replace: true });
          return;
        }

        const latitude = toNumberOrNull(recordMetadata.pickup_latitude);
        const longitude = toNumberOrNull(recordMetadata.pickup_longitude);
        if (latitude === null || longitude === null) {
          throw new Error("Pickup coordinates are missing for this paid cab booking.");
        }

        const data = await mobilityService.getNearbyDrivers({
          latitude,
          longitude,
          radius_km: DRIVER_SEARCH_RADIUS_KM,
          passengers: Number(recordMetadata.passengers) || passengers,
          tier_key: recordMetadata.tier_key || tier.key,
          limit: 50,
        });

        if (active) setDrivers(sortNearbyDrivers(Array.isArray(data) ? data : []));
      } catch (error) {
        console.error("Failed to load driver ranking", error);
        toast.error(error.response?.data?.detail || error.message || "Could not load nearby drivers.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDrivers();
    return () => {
      active = false;
    };
  }, [bookingId]);

  const handleSelectDriver = async (driverItem) => {
    const driver = driverItem?.driver;
    if (!driver || selectingDriverId) return;

    setSelectingDriverId(driver.id);
    try {
      await mobilityService.createRideRequest({
        booking_request_id: String(booking.id),
        selected_driver_id: driver.id,
        customer_user_id: booking?.user_id ? String(booking.user_id) : user?.id ? String(user.id) : null,
        customer_name: booking?.user_name || user?.username || user?.email || null,
        customer_email: booking?.user_email || user?.email || null,
        customer_phone: user?.mobile || metadata.customer_phone || null,
        pickup_label: metadata.pickup,
        drop_label: metadata.drop,
        pickup_latitude: pickupLatitude,
        pickup_longitude: pickupLongitude,
        drop_latitude: toNumberOrNull(metadata.drop_latitude),
        drop_longitude: toNumberOrNull(metadata.drop_longitude),
        passengers,
        tier_key: tier.key,
        tier_label: tier.label,
        tier_fare: tier.perKmRate,
        trip_distance_km: toNumberOrNull(metadata.trip_distance_km),
        estimated_fare: toNumberOrNull(metadata.estimated_fare),
        notes: `Paid cab request | Travel date: ${metadata.travel_date || "today"}${metadata.notes ? ` | ${metadata.notes}` : ""}`,
        source: "customer_app",
      });

      toast.success(`Request sent to ${driver.full_name || "selected driver"}.`);
      navigate("/activity", { replace: true });
    } catch (error) {
      console.error("Failed to select driver", error);
      toast.error(error.response?.data?.detail || "Could not send request to this driver.");
      setSelectingDriverId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 rounded-[32px] border border-orange-100 bg-white p-6 shadow-sm sm:p-8">
        <Link to="/cabs" className="inline-flex w-fit items-center gap-2 rounded-full bg-gray-50 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100">
          <FiArrowLeft />
          Back to cabs
        </Link>
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-600">Driver ranking</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-gray-900">Choose your Zahi driver</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-500">
              Payment is complete. Select one nearby eligible driver and the request will go only to that driver.
            </p>
          </div>
          <div className="rounded-3xl bg-orange-50 p-5 text-sm text-orange-900">
            <p className="font-black">{tier.label} - {formatCurrency(tier.perKmRate)}/km</p>
            <p className="mt-1">{passengers} passenger{passengers === 1 ? "" : "s"} - {formatShortDate(metadata.travel_date)}</p>
            <p className="mt-1 font-black">{formatCurrency(metadata.estimated_fare || booking?.total_amount || 0)}</p>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-2">
          <div className="flex items-start gap-2 rounded-2xl bg-gray-50 px-4 py-3">
            <FiMapPin className="mt-0.5 shrink-0 text-orange-500" />
            <span><b>Pickup:</b> {metadata.pickup || "Pickup"}</span>
          </div>
          <div className="flex items-start gap-2 rounded-2xl bg-gray-50 px-4 py-3">
            <FiMapPin className="mt-0.5 shrink-0 text-orange-500" />
            <span><b>Drop:</b> {metadata.drop || "Drop"}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-[32px] border border-gray-100 bg-white py-20 text-sm font-bold text-gray-400">
          <div className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-orange-100 border-t-orange-500" />
          Loading nearest drivers...
        </div>
      ) : drivers.length ? (
        <div className="grid gap-4">
          {drivers.map((item, index) => {
            const driver = item.driver || {};
            const vehicle = driver.vehicle || {};
            const photos = vehiclePhotosFrom(vehicle);
            const vehicleTitle = vehicle.vehicle_name || "Vehicle";
            const selecting = selectingDriverId === driver.id;

            return (
              <motion.article
                key={driver.id || index}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.24) }}
                className="rounded-[30px] border border-gray-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gray-900/5"
              >
                <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex min-w-0 gap-4">
                      {photos[0] ? (
                        <img src={photos[0]} alt={vehicleTitle} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                      ) : driver.profile_photo_url ? (
                        <img src={driver.profile_photo_url} alt={driver.full_name || "Driver"} className="h-16 w-16 shrink-0 rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                        <MdOutlineLocalTaxi className="text-3xl" />
                      </div>
                    )}

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-black text-gray-900">{driver.full_name || "Zahi Driver"}</h2>
                          {index === 0 ? (
                            <span className="rounded-full bg-green-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-green-700">Nearest</span>
                          ) : null}
                          <span className="rounded-full bg-gray-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500">Rank #{index + 1}</span>
                        </div>

                        <p className="mt-2 text-sm font-semibold text-gray-500">
                          {[vehicle.vehicle_name, vehicle.vehicle_type, vehicle.plate_number].filter(Boolean).join(" - ") || "Vehicle details available after acceptance"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-gray-500">
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1.5">
                            <FiMapPin className="text-orange-500" />
                            {formatDistance(item.distance_km)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1.5">
                            <FiStar className="text-orange-500" />
                            {Number(driver.rating || 0).toFixed(1)}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1.5">
                            <FiUsers className="text-orange-500" />
                            {vehicle.seat_capacity || passengers} seats
                          </span>
                          {item.contact_phone ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-3 py-1.5">
                              <FiPhone className="text-orange-500" />
                              Shared after accept
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <VehiclePhotoPreview
                      photos={photos}
                      title={vehicleTitle}
                      onOpen={() => setGallery({ title: vehicleTitle, photos })}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 lg:justify-end">
                    <button
                      type="button"
                      onClick={() => setGallery({ title: vehicleTitle, photos })}
                      disabled={!photos.length}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-5 py-3 text-sm font-black text-orange-700 transition-all hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FiImage />
                      Vehicle photos
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectDriver(item)}
                      disabled={Boolean(selectingDriverId)}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-black !text-white shadow-lg shadow-gray-900/10 transition-all hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {selecting ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      ) : (
                        <FiCheckCircle />
                      )}
                      {selecting ? "Sending request" : "Select driver"}
                    </button>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[32px] border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
          <FiAlertCircle className="mx-auto text-5xl text-gray-200" />
          <h2 className="mt-6 text-2xl font-black text-gray-900">No eligible drivers found</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-gray-500">
            No nearby driver currently matches this tier and passenger count. Try a different tier or pickup area.
          </p>
          <Link to="/cabs" className="mt-8 inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-bold !text-white">
            Change cab search
          </Link>
        </div>
      )}

      {gallery ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-950/80 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-orange-600">Vehicle gallery</p>
                <h3 className="mt-1 text-2xl font-black text-gray-900">{gallery.title}</h3>
              </div>
              <button type="button" onClick={() => setGallery(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200">
                <FiX />
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {gallery.photos.map((photo, index) => (
                <img key={`${photo}-${index}`} src={photo} alt={`${gallery.title} ${index + 1}`} className="h-72 w-full rounded-2xl object-cover" />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CabDriverSelectionPage;
