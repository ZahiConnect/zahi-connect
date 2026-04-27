import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  CarFront,
  CheckCircle2,
  FileImage,
  MapPin,
  Phone,
  RefreshCcw,
  ShieldCheck,
  Users,
  Wallet,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import useDriverLocation from "../../hooks/useDriverLocation";
import { formatCurrency, formatDateTime } from "../../lib/format";
import mobilityService from "../../services/mobilityService";

const emptyToNull = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
};

const parseInteger = (value, fallback = null) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseFloatNumber = (value, fallback = null) => {
  const parsed = Number.parseFloat(String(value));
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildProfileDraft = (driver = {}) => {
  const d = driver || {};
  return {
    full_name: d.full_name || "",
    phone: d.phone || "",
    aadhaar_number: d.aadhaar_number || "",
    license_number: d.license_number || "",
    emergency_contact_name: d.emergency_contact_name || "",
    emergency_contact_phone: d.emergency_contact_phone || "",
    current_area_label: d.current_area_label || "",
  };
};

const buildVehicleDraft = (vehicle = {}) => {
  const v = vehicle || {};
  return {
    vehicle_name: v.vehicle_name || "",
    vehicle_type: v.vehicle_type || "Cab",
    brand: v.brand || "",
    model: v.model || "",
    plate_number: v.plate_number || "",
    color: v.color || "",
    year: v.year ?? "",
    seat_capacity: v.seat_capacity ?? 4,
    air_conditioned: v.air_conditioned !== false,
    availability_notes: v.availability_notes || "",
    base_fare: v.base_fare ?? 250,
    per_km_rate: v.per_km_rate ?? 18,
  };
};

const buildProfileAssets = (driver = {}) => {
  const d = driver || {};
  return {
    profile_photo_url: d.profile_photo_url || null,
    aadhaar_image_url: d.aadhaar_image_url || null,
    license_image_url: d.license_image_url || null,
  };
};

const buildVehicleAssets = (vehicle = {}) => {
  const v = vehicle || {};
  return {
    photo_url: v.photo_url || null,
    rc_image_url: v.rc_image_url || null,
    insurance_image_url: v.insurance_image_url || null,
  };
};

const getOnlineReadinessIssues = (driver) => {
  const issues = [];
  const vehicle = driver?.vehicle;

  if (!emptyToNull(driver?.phone)) issues.push("Add your phone number before going online.");
  if (!vehicle) {
    issues.push("Add your vehicle details before going online.");
    return issues;
  }
  if (!emptyToNull(vehicle.vehicle_name)) issues.push("Add your vehicle name before going online.");
  if (!emptyToNull(vehicle.plate_number)) issues.push("Add your plate number before going online.");
  if (!Number.isFinite(Number(vehicle.seat_capacity)) || Number(vehicle.seat_capacity) < 1) {
    issues.push("Add a valid seat capacity before going online.");
  }

  return issues;
};

const UploadField = ({ label, file, url, onChange }) => (
  <label className="block">
    <span className="field-label flex items-center gap-2">
      <FileImage className="h-4 w-4" />
      {label}
    </span>
    <input
      type="file"
      accept="image/*"
      onChange={(event) => onChange(event.target.files?.[0] || null)}
      className="field-upload"
    />
    <p className="mt-2 text-xs text-slate-400">
      {file ? file.name : url ? "Uploaded and ready" : "No file selected"}
    </p>
  </label>
);

const AssetLink = ({ label, url }) => {
  if (!url) {
    return <span className="text-xs text-[#7c8b82]">{label}: pending</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-xs font-semibold text-zinc-900 underline decoration-[rgba(31,93,74,0.2)] underline-offset-4"
    >
      {label}
    </a>
  );
};

const DriverDashboardPage = () => {
  const { user: driver, applySession } = useAuth();
  const { coordinates, locationLabel, status, requestLocation } = useDriverLocation(true);
  const [dashboard, setDashboard] = useState(null);
  const [rideRequests, setRideRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [switchingOnline, setSwitchingOnline] = useState(false);
  const [profileForm, setProfileForm] = useState(() => buildProfileDraft(driver));
  const [vehicleForm, setVehicleForm] = useState(() => buildVehicleDraft(driver?.vehicle));
  const [profileAssets, setProfileAssets] = useState(() => buildProfileAssets(driver));
  const [vehicleAssets, setVehicleAssets] = useState(() => buildVehicleAssets(driver?.vehicle));
  const [profileFiles, setProfileFiles] = useState({
    profile_photo_url: null,
    aadhaar_image_url: null,
    license_image_url: null,
  });
  const [vehicleFiles, setVehicleFiles] = useState({
    photo_url: null,
    rc_image_url: null,
    insurance_image_url: null,
  });

  const hydrateDriverState = (nextDriver) => {
    applySession({ driver: nextDriver }, { preserveAccess: true });
    setProfileForm(buildProfileDraft(nextDriver));
    setVehicleForm(buildVehicleDraft(nextDriver?.vehicle));
    setProfileAssets(buildProfileAssets(nextDriver));
    setVehicleAssets(buildVehicleAssets(nextDriver?.vehicle));
    setProfileFiles({
      profile_photo_url: null,
      aadhaar_image_url: null,
      license_image_url: null,
    });
    setVehicleFiles({
      photo_url: null,
      rc_image_url: null,
      insurance_image_url: null,
    });
  };

  const loadDashboard = async () => {
    const [dashboardPayload, ridePayload] = await Promise.all([
      mobilityService.getDashboard(),
      mobilityService.getRideRequests(12),
    ]);

    setDashboard(dashboardPayload);
    setRideRequests(Array.isArray(ridePayload) ? ridePayload : []);
    if (dashboardPayload?.driver) {
      hydrateDriverState(dashboardPayload.driver);
    }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        await loadDashboard();
      } catch (error) {
        if (active) {
          console.error("Failed to load driver dashboard", error);
          toast.error("Could not load the driver dashboard.");
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
  }, []);

  useEffect(() => {
    if (!locationLabel) return;
    setProfileForm((current) =>
      current.current_area_label ? current : { ...current, current_area_label: locationLabel }
    );
  }, [locationLabel]);

  const stats = dashboard?.stats || {};
  const documentCount = useMemo(
    () =>
      [
        profileAssets.profile_photo_url,
        profileAssets.aadhaar_image_url,
        profileAssets.license_image_url,
        vehicleAssets.photo_url,
        vehicleAssets.rc_image_url,
        vehicleAssets.insurance_image_url,
      ].filter(Boolean).length,
    [profileAssets, vehicleAssets]
  );

  const uploadSelectedFiles = async (files, currentAssets) => {
    const nextAssets = { ...currentAssets };
    for (const [key, file] of Object.entries(files)) {
      if (!file) continue;
      const response = await mobilityService.uploadImage(file);
      nextAssets[key] = response.url;
    }
    return nextAssets;
  };

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setSavingProfile(true);
    try {
      const nextAssets = await uploadSelectedFiles(profileFiles, profileAssets);
      const response = await mobilityService.updateProfile({
        full_name: profileForm.full_name,
        phone: profileForm.phone,
        aadhaar_number: emptyToNull(profileForm.aadhaar_number),
        aadhaar_image_url: nextAssets.aadhaar_image_url,
        license_number: emptyToNull(profileForm.license_number),
        license_image_url: nextAssets.license_image_url,
        profile_photo_url: nextAssets.profile_photo_url,
        emergency_contact_name: emptyToNull(profileForm.emergency_contact_name),
        emergency_contact_phone: emptyToNull(profileForm.emergency_contact_phone),
        current_area_label: emptyToNull(profileForm.current_area_label),
        current_latitude: coordinates?.latitude ?? driver?.current_latitude ?? null,
        current_longitude: coordinates?.longitude ?? driver?.current_longitude ?? null,
      });

      hydrateDriverState(response);
      setDashboard((current) => (current ? { ...current, driver: response } : current));
      toast.success("Driver profile updated.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not update your profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleVehicleSave = async (event) => {
    event.preventDefault();
    setSavingVehicle(true);
    try {
      const nextAssets = await uploadSelectedFiles(vehicleFiles, vehicleAssets);
      const response = await mobilityService.updateVehicle({
        vehicle_name: vehicleForm.vehicle_name,
        vehicle_type: vehicleForm.vehicle_type,
        brand: emptyToNull(vehicleForm.brand),
        model: emptyToNull(vehicleForm.model),
        plate_number: vehicleForm.plate_number,
        color: emptyToNull(vehicleForm.color),
        year: parseInteger(vehicleForm.year),
        seat_capacity: parseInteger(vehicleForm.seat_capacity, 4) || 4,
        air_conditioned: Boolean(vehicleForm.air_conditioned),
        photo_url: nextAssets.photo_url,
        rc_image_url: nextAssets.rc_image_url,
        insurance_image_url: nextAssets.insurance_image_url,
        availability_notes: emptyToNull(vehicleForm.availability_notes),
        base_fare: parseFloatNumber(vehicleForm.base_fare, 250) || 250,
        per_km_rate: parseFloatNumber(vehicleForm.per_km_rate, 18) || 18,
      });

      hydrateDriverState(response);
      setDashboard((current) => (current ? { ...current, driver: response } : current));
      toast.success("Vehicle details updated.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not update the vehicle.");
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleToggleOnline = async () => {
    const nextOnline = !driver?.is_online;
    if (nextOnline) {
      const issues = getOnlineReadinessIssues(driver);
      if (issues.length) {
        toast.error(issues[0]);
        return;
      }
    }
    if (nextOnline && !coordinates && !(driver?.current_latitude && driver?.current_longitude)) {
      requestLocation();
      toast.error("Allow location access before going online.");
      return;
    }

    setSwitchingOnline(true);
    try {
      const response = await mobilityService.updateStatus({
        is_online: nextOnline,
        current_area_label: emptyToNull(profileForm.current_area_label) || locationLabel || null,
        current_latitude: coordinates?.latitude ?? driver?.current_latitude ?? null,
        current_longitude: coordinates?.longitude ?? driver?.current_longitude ?? null,
      });

      hydrateDriverState(response);
      setDashboard((current) =>
        current
          ? {
              ...current,
              driver: response,
              stats: {
                ...(current.stats || {}),
                online_status: response.is_online,
              },
            }
          : current
      );
      toast.success(nextOnline ? "You are now visible to customers." : "You are offline now.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not update online status.");
    } finally {
      setSwitchingOnline(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="drive-panel h-56 animate-pulse rounded-3xl" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="drive-card h-96 animate-pulse rounded-3xl" />
          <div className="drive-card h-96 animate-pulse rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="drive-panel rounded-3xl px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-amber-600">Driver dashboard</p>
            <h1 className="font-display mt-3 text-6xl leading-none text-zinc-900">
              {driver?.full_name || "Driver"}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-500">
              Keep your cab details current, manage your online status, and watch the latest paid
              riders flowing in from the customer app.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:max-w-md lg:justify-end">
            <button
              type="button"
              onClick={handleToggleOnline}
              disabled={switchingOnline}
              className={`inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 ${
                driver?.is_online ? "bg-[#ef4444]" : "bg-zinc-900"
              }`}
            >
              <CheckCircle2 className="h-4 w-4" />
              {switchingOnline
                ? "Updating..."
                : driver?.is_online
                  ? "Go offline"
                  : "Go online"}
            </button>
            <button
              type="button"
              onClick={requestLocation}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900"
            >
              <MapPin className="h-4 w-4" />
              Refresh location
            </button>
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                try {
                  await loadDashboard();
                } catch (error) {
                  toast.error(error.response?.data?.detail || "Could not refresh dashboard data.");
                } finally {
                  setLoading(false);
                }
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-zinc-900"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh data
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-900">
            {driver?.is_online ? "Visible in customer search" : "Offline from customer search"}
          </span>
          <span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
            {locationLabel || driver?.current_area_label || "Location pending"}
          </span>
          <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-900">
            {documentCount} documents uploaded
          </span>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Paid customers",
            value: stats.paid_customers || 0,
            caption: "Completed paid riders assigned to you",
            icon: Users,
            tone: "bg-slate-100 text-zinc-900",
          },
          {
            label: "Total fare value",
            value: formatCurrency(stats.total_fare || 0),
            caption: "Customer-side payment volume",
            icon: Wallet,
            tone: "bg-amber-50 text-amber-600",
          },
          {
            label: "Zahi commission",
            value: formatCurrency(stats.total_commission || 0),
            caption: `${Math.round((stats.commission_rate || 0) * 100)}% platform commission`,
            icon: ShieldCheck,
            tone: "bg-[#f3f7ff] text-[#35508d]",
          },
          {
            label: "Vehicle base fare",
            value: formatCurrency(driver?.vehicle?.base_fare || 0),
            caption: driver?.vehicle?.vehicle_name || "Add vehicle details",
            icon: CarFront,
            tone: "bg-[#f6f3ff] text-[#5c4a8f]",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="drive-card rounded-2xl p-5">
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${item.tone}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#7a8a82]">{item.label}</p>
              <p className="font-display mt-3 text-5xl leading-none text-zinc-900">{item.value}</p>
              <p className="mt-3 text-sm leading-7 text-slate-500">{item.caption}</p>
            </div>
          );
        })}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <form onSubmit={handleProfileSave} className="drive-card rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <div className="field-section-icon">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-600">Driver details</p>
              <h2 className="font-display text-4xl leading-none text-zinc-900">Profile and compliance</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Full name</span>
              <input
                type="text"
                value={profileForm.full_name}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, full_name: event.target.value }))
                }
                className="field-input"
                required
              />
            </label>

            <label className="block">
              <span className="field-label">Phone</span>
              <input
                type="tel"
                value={profileForm.phone}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, phone: event.target.value }))
                }
                className="field-input"
                required
              />
            </label>

            <label className="block">
              <span className="field-label">Aadhaar number</span>
              <input
                type="text"
                value={profileForm.aadhaar_number}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, aadhaar_number: event.target.value }))
                }
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Licence number</span>
              <input
                type="text"
                value={profileForm.license_number}
                onChange={(event) =>
                  setProfileForm((current) => ({ ...current, license_number: event.target.value }))
                }
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Emergency contact name</span>
              <input
                type="text"
                value={profileForm.emergency_contact_name}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    emergency_contact_name: event.target.value,
                  }))
                }
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Emergency contact phone</span>
              <input
                type="tel"
                value={profileForm.emergency_contact_phone}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    emergency_contact_phone: event.target.value,
                  }))
                }
                className="field-input"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="field-label">Current operating area</span>
              <input
                type="text"
                value={profileForm.current_area_label}
                onChange={(event) =>
                  setProfileForm((current) => ({
                    ...current,
                    current_area_label: event.target.value,
                  }))
                }
                className="field-input"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            <UploadField
              label="Profile photo"
              file={profileFiles.profile_photo_url}
              url={profileAssets.profile_photo_url}
              onChange={(file) =>
                setProfileFiles((current) => ({ ...current, profile_photo_url: file }))
              }
            />
            <UploadField
              label="Aadhaar image"
              file={profileFiles.aadhaar_image_url}
              url={profileAssets.aadhaar_image_url}
              onChange={(file) =>
                setProfileFiles((current) => ({ ...current, aadhaar_image_url: file }))
              }
            />
            <UploadField
              label="Licence image"
              file={profileFiles.license_image_url}
              url={profileAssets.license_image_url}
              onChange={(file) =>
                setProfileFiles((current) => ({ ...current, license_image_url: file }))
              }
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <AssetLink label="Profile photo" url={profileAssets.profile_photo_url} />
            <AssetLink label="Aadhaar image" url={profileAssets.aadhaar_image_url} />
            <AssetLink label="Licence image" url={profileAssets.license_image_url} />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={savingProfile}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingProfile ? "Saving profile..." : "Save profile"}
            </button>
            <span className="text-sm text-slate-500">
              {status === "ready" && locationLabel
                ? `Latest location: ${locationLabel}`
                : "Refresh location before going online if your area changed."}
            </span>
          </div>
        </form>

        <form onSubmit={handleVehicleSave} className="drive-card rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <div className="field-section-icon yellow">
              <CarFront className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-600">Cab details</p>
              <h2 className="font-display text-4xl leading-none text-zinc-900">Vehicle setup</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Vehicle name</span>
              <input
                type="text"
                value={vehicleForm.vehicle_name}
                onChange={(event) =>
                  setVehicleForm((current) => ({ ...current, vehicle_name: event.target.value }))
                }
                className="field-input"
                required
              />
            </label>

            <label className="block">
              <span className="field-label">Vehicle type</span>
              <input
                type="text"
                value={vehicleForm.vehicle_type}
                onChange={(event) =>
                  setVehicleForm((current) => ({ ...current, vehicle_type: event.target.value }))
                }
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Brand</span>
              <input
                type="text"
                value={vehicleForm.brand}
                onChange={(event) =>
                  setVehicleForm((current) => ({ ...current, brand: event.target.value }))
                }
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Model</span>
              <input
                type="text"
                value={vehicleForm.model}
                onChange={(event) =>
                  setVehicleForm((current) => ({ ...current, model: event.target.value }))
                }
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Plate number</span>
              <input
                type="text"
                value={vehicleForm.plate_number}
                onChange={(event) =>
                  setVehicleForm((current) => ({
                    ...current,
                    plate_number: event.target.value.toUpperCase(),
                  }))
                }
                className="field-input uppercase"
                required
              />
            </label>

            <label className="block">
              <span className="field-label">Color</span>
              <input
                type="text"
                value={vehicleForm.color}
                onChange={(event) =>
                  setVehicleForm((current) => ({ ...current, color: event.target.value }))
                }
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Year</span>
              <input
                type="number"
                value={vehicleForm.year}
                onChange={(event) =>
                  setVehicleForm((current) => ({ ...current, year: event.target.value }))
                }
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Seat capacity</span>
              <input
                type="number"
                min="1"
                max="12"
                value={vehicleForm.seat_capacity}
                onChange={(event) =>
                  setVehicleForm((current) => ({
                    ...current,
                    seat_capacity: event.target.value,
                  }))
                }
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Base fare</span>
              <input
                type="number"
                min="0"
                value={vehicleForm.base_fare}
                onChange={(event) =>
                  setVehicleForm((current) => ({ ...current, base_fare: event.target.value }))
                }
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Per km rate</span>
              <input
                type="number"
                min="0"
                value={vehicleForm.per_km_rate}
                onChange={(event) =>
                  setVehicleForm((current) => ({ ...current, per_km_rate: event.target.value }))
                }
                className="field-input"
              />
            </label>
          </div>

          <label className="mt-4 block">
            <span className="field-label">Availability notes</span>
            <textarea
              rows={3}
              value={vehicleForm.availability_notes}
              onChange={(event) =>
                setVehicleForm((current) => ({
                  ...current,
                  availability_notes: event.target.value,
                }))
              }
              className="field-input"
            />
          </label>

          <label className="mt-4 inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-500">
            <input
              type="checkbox"
              checked={vehicleForm.air_conditioned}
              onChange={(event) =>
                setVehicleForm((current) => ({
                  ...current,
                  air_conditioned: event.target.checked,
                }))
              }
              className="h-4 w-4 rounded border-slate-200"
            />
            Air conditioned
          </label>

          <div className="mt-5 grid gap-6 sm:grid-cols-3">
            <UploadField
              label="Vehicle photo"
              file={vehicleFiles.photo_url}
              url={vehicleAssets.photo_url}
              onChange={(file) =>
                setVehicleFiles((current) => ({ ...current, photo_url: file }))
              }
            />
            <UploadField
              label="RC image"
              file={vehicleFiles.rc_image_url}
              url={vehicleAssets.rc_image_url}
              onChange={(file) =>
                setVehicleFiles((current) => ({ ...current, rc_image_url: file }))
              }
            />
            <UploadField
              label="Insurance image"
              file={vehicleFiles.insurance_image_url}
              url={vehicleAssets.insurance_image_url}
              onChange={(file) =>
                setVehicleFiles((current) => ({ ...current, insurance_image_url: file }))
              }
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <AssetLink label="Vehicle photo" url={vehicleAssets.photo_url} />
            <AssetLink label="RC image" url={vehicleAssets.rc_image_url} />
            <AssetLink label="Insurance image" url={vehicleAssets.insurance_image_url} />
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={savingVehicle}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {savingVehicle ? "Saving vehicle..." : "Save vehicle"}
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="drive-card rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <div className="field-section-icon">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-600">Latest paid customers</p>
              <h2 className="font-display text-4xl leading-none text-zinc-900">Recent payouts view</h2>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {dashboard?.recent_paid_customers?.length ? (
              dashboard.recent_paid_customers.map((ride) => (
                <div key={ride.id} className="rounded-[24px] border border-[rgba(34,64,53,0.1)] bg-white p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-zinc-900">
                        {ride.customer_name || "Customer"} · {ride.passengers} passenger(s)
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        {ride.pickup_label} to {ride.drop_label}
                      </p>
                      <p className="text-sm leading-7 text-slate-500">
                        {ride.customer_phone ? (
                          <a href={`tel:${ride.customer_phone}`} className="font-medium text-zinc-900">
                            {ride.customer_phone}
                          </a>
                        ) : (
                          "Customer phone pending"
                        )}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-sm font-semibold text-zinc-900">
                        {formatCurrency(ride.estimated_fare)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-amber-600">
                        Zahi commission {formatCurrency(ride.commission_amount)}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-[#7c8b82]">
                        {formatDateTime(ride.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] bg-[#f6faf7] px-4 py-6 text-sm leading-7 text-slate-500">
                No paid customers yet. Go online to appear in customer search and start receiving
                ride requests.
              </div>
            )}
          </div>
        </section>

        <section className="drive-card rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <div className="field-section-icon yellow">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-600">Activity feed</p>
              <h2 className="font-display text-4xl leading-none text-zinc-900">Assigned ride requests</h2>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {rideRequests.length ? (
              rideRequests.map((ride) => (
                <div key={ride.id} className="rounded-[24px] border border-[rgba(34,64,53,0.1)] bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-zinc-900">
                        {ride.pickup_label} to {ride.drop_label}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        {ride.customer_name || "Customer"} · {ride.passengers} passenger(s)
                      </p>
                      <p className="text-sm leading-7 text-slate-500">
                        {ride.customer_phone ? (
                          <a
                            href={`tel:${ride.customer_phone}`}
                            className="inline-flex items-center gap-2 font-medium text-zinc-900"
                          >
                            <Phone className="h-4 w-4" />
                            {ride.customer_phone}
                          </a>
                        ) : (
                          "No phone shared"
                        )}
                      </p>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-900">
                        {ride.status}
                      </span>
                      <p className="mt-3 text-sm font-semibold text-zinc-900">
                        {formatCurrency(ride.estimated_fare)}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[#7c8b82]">
                        {formatDateTime(ride.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] bg-[#f6faf7] px-4 py-6 text-sm leading-7 text-slate-500">
                No ride assignments yet. Once customers book cabs from the user portal, the latest
                ones will appear here.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DriverDashboardPage;
