import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import mobilityService from "../services/mobilityService";
import useDriverLocation from "../hooks/useDriverLocation";

const emptyToNull = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = String(v).trim();
  return t || null;
};
const parseInteger = (v, fallback = null) => {
  const p = Number.parseInt(String(v), 10);
  return Number.isFinite(p) ? p : fallback;
};
const parseFloat_ = (v, fallback = null) => {
  const p = Number.parseFloat(String(v));
  return Number.isFinite(p) ? p : fallback;
};

export const buildProfileDraft = (d = {}) => ({
  full_name: d.full_name || "",
  phone: d.phone || "",
  aadhaar_number: d.aadhaar_number || "",
  license_number: d.license_number || "",
  emergency_contact_name: d.emergency_contact_name || "",
  emergency_contact_phone: d.emergency_contact_phone || "",
  current_area_label: d.current_area_label || "",
});

export const buildVehicleDraft = (v = {}) => ({
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
});

const DashboardContext = createContext(null);

export const DashboardProvider = ({ children }) => {
  const { user: driver, applySession } = useAuth();
  const { coordinates, locationLabel, status: locStatus, requestLocation } = useDriverLocation(true);

  const [dashboard, setDashboard] = useState(null);
  const [rideRequests, setRideRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [switchingOnline, setSwitchingOnline] = useState(false);

  const [profileForm, setProfileForm] = useState(() => buildProfileDraft(driver));
  const [vehicleForm, setVehicleForm] = useState(() => buildVehicleDraft(driver?.vehicle));
  const [profileAssets, setProfileAssets] = useState({
    profile_photo_url: driver?.profile_photo_url || null,
    aadhaar_image_url: driver?.aadhaar_image_url || null,
    license_image_url: driver?.license_image_url || null,
  });
  const [vehicleAssets, setVehicleAssets] = useState({
    photo_url: driver?.vehicle?.photo_url || null,
    rc_image_url: driver?.vehicle?.rc_image_url || null,
    insurance_image_url: driver?.vehicle?.insurance_image_url || null,
  });
  const [profileFiles, setProfileFiles] = useState({ profile_photo_url: null, aadhaar_image_url: null, license_image_url: null });
  const [vehicleFiles, setVehicleFiles] = useState({ photo_url: null, rc_image_url: null, insurance_image_url: null });

  const hydrateDriverState = (nextDriver) => {
    applySession({ driver: nextDriver }, { preserveAccess: true });
    setProfileForm(buildProfileDraft(nextDriver));
    setVehicleForm(buildVehicleDraft(nextDriver?.vehicle));
    setProfileAssets({
      profile_photo_url: nextDriver?.profile_photo_url || null,
      aadhaar_image_url: nextDriver?.aadhaar_image_url || null,
      license_image_url: nextDriver?.license_image_url || null,
    });
    setVehicleAssets({
      photo_url: nextDriver?.vehicle?.photo_url || null,
      rc_image_url: nextDriver?.vehicle?.rc_image_url || null,
      insurance_image_url: nextDriver?.vehicle?.insurance_image_url || null,
    });
    setProfileFiles({ profile_photo_url: null, aadhaar_image_url: null, license_image_url: null });
    setVehicleFiles({ photo_url: null, rc_image_url: null, insurance_image_url: null });
  };

  useEffect(() => {
    let alive = true;
    const loadAll = async () => {
      try {
        setLoading(true);
        const [dash, rides] = await Promise.all([
          mobilityService.getDashboard(),
          mobilityService.getRideRequests(20),
        ]);
        if (!alive) return;
        setDashboard(dash);
        setRideRequests(rides);
        hydrateDriverState(dash.driver);
      } catch {
        if (alive) toast.error("Failed to load dashboard data.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    loadAll();
    return () => { alive = false; };
  }, []);

  const toggleOnline = async () => {
    if (switchingOnline) return;
    const goingOnline = !driver?.is_online;
    
    if (goingOnline && locStatus !== "ready") {
      toast.loading("Getting your location...", { id: "location-toast" });
      const ready = await requestLocation();
      if (!ready) {
        toast.error("Failed to get location. Cannot go online.", { id: "location-toast" });
        return;
      }
      toast.dismiss("location-toast");
    }

    setSwitchingOnline(true);
    try {
      // Use the latest coordinates and location from refs or state if possible. 
      // After requestLocation() returns, localStorage has the latest.
      const payload = JSON.parse(window.localStorage.getItem("zahi_drive_location_coords") || "null");
      const currentLabel = window.localStorage.getItem("zahi_drive_location_label");

      const updated = await mobilityService.updateStatus({
        is_online: goingOnline,
        current_area_label: goingOnline ? emptyToNull(locationLabel || currentLabel) : null,
        current_latitude: goingOnline ? (coordinates?.latitude ?? payload?.latitude ?? null) : null,
        current_longitude: goingOnline ? (coordinates?.longitude ?? payload?.longitude ?? null) : null,
      });
      hydrateDriverState(updated);
      toast.success(goingOnline ? "You are now ONLINE 🟢" : "You are now OFFLINE 🔴");
    } catch {
      toast.error("Failed to update status.");
    } finally {
      setSwitchingOnline(false);
    }
  };

  const uploadFiles = async (filesMap) => {
    const uploaded = {};
    for (const [key, file] of Object.entries(filesMap)) {
      if (file) {
        const result = await mobilityService.uploadImage(file);
        uploaded[key] = result.url;
      }
    }
    return uploaded;
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const uploads = await uploadFiles(profileFiles);
      const payload = {
        full_name: emptyToNull(profileForm.full_name),
        phone: emptyToNull(profileForm.phone),
        aadhaar_number: emptyToNull(profileForm.aadhaar_number),
        license_number: emptyToNull(profileForm.license_number),
        emergency_contact_name: emptyToNull(profileForm.emergency_contact_name),
        emergency_contact_phone: emptyToNull(profileForm.emergency_contact_phone),
        current_area_label: emptyToNull(profileForm.current_area_label),
        ...Object.fromEntries(Object.entries({ ...profileAssets, ...uploads }).map(([k, v]) => [k, v || null])),
      };
      const updated = await mobilityService.updateProfile(payload);
      hydrateDriverState(updated);
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveVehicle = async () => {
    setSavingVehicle(true);
    try {
      const uploads = await uploadFiles(vehicleFiles);
      const payload = {
        vehicle_name: vehicleForm.vehicle_name,
        vehicle_type: vehicleForm.vehicle_type,
        brand: emptyToNull(vehicleForm.brand),
        model: emptyToNull(vehicleForm.model),
        plate_number: vehicleForm.plate_number,
        color: emptyToNull(vehicleForm.color),
        year: parseInteger(vehicleForm.year),
        seat_capacity: parseInteger(vehicleForm.seat_capacity, 4),
        air_conditioned: vehicleForm.air_conditioned,
        availability_notes: emptyToNull(vehicleForm.availability_notes),
        base_fare: parseFloat_(vehicleForm.base_fare, 250),
        per_km_rate: parseFloat_(vehicleForm.per_km_rate, 18),
        ...Object.fromEntries(Object.entries({ ...vehicleAssets, ...uploads }).map(([k, v]) => [k, v || null])),
      };
      const updated = await mobilityService.updateVehicle(payload);
      hydrateDriverState(updated);
      toast.success("Vehicle updated!");
    } catch {
      toast.error("Failed to save vehicle.");
    } finally {
      setSavingVehicle(false);
    }
  };

  const [theme, setTheme] = useState(() => localStorage.getItem("zahi-driver-theme") || "light");

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("zahi-driver-theme", next);
  };

  return (
    <DashboardContext.Provider value={{
      driver, dashboard, rideRequests, loading,
      theme, toggleTheme,
      profileForm, setProfileForm,
      vehicleForm, setVehicleForm,
      profileAssets, setProfileAssets,
      vehicleAssets, setVehicleAssets,
      profileFiles, setProfileFiles,
      vehicleFiles, setVehicleFiles,
      savingProfile, savingVehicle, switchingOnline,
      saveProfile, saveVehicle, toggleOnline,
      locationLabel, locStatus, requestLocation,
    }}>
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const ctx = useContext(DashboardContext);
  if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
  return ctx;
};
