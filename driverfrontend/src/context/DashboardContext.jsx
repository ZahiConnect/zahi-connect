import { createContext, useContext, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "./AuthContext";
import mobilityService from "../services/mobilityService";

const emptyToNull = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const t = String(v).trim();
  return t || null;
};
const hasText = (value) => Boolean(emptyToNull(value));
const parseInteger = (v, fallback = null) => {
  const p = Number.parseInt(String(v), 10);
  return Number.isFinite(p) ? p : fallback;
};
const normalizeUrlList = (urls = [], fallbackUrl = null) => {
  const values = Array.isArray(urls) ? urls : [];
  const normalized = [fallbackUrl, ...values]
    .map(emptyToNull)
    .filter(Boolean);

  return [...new Set(normalized)].slice(0, 12);
};
const mergeUrlLists = (...lists) => {
  const merged = lists.flatMap((list) => (Array.isArray(list) ? list : list ? [list] : []));
  return normalizeUrlList(merged);
};
const buildLocationPayload = (place = {}) => {
  const coordinates = place.coordinates || {};
  const latitude = Number(place.current_latitude ?? place.latitude ?? coordinates.latitude);
  const longitude = Number(place.current_longitude ?? place.longitude ?? coordinates.longitude);
  const label = emptyToNull(place.current_area_label ?? place.shortLabel ?? place.label);

  if (!label || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    current_area_label: label,
    current_latitude: latitude,
    current_longitude: longitude,
  };
};
const rememberLocation = (payload) => {
  try {
    window.localStorage.setItem("zahi_drive_location_label", payload.current_area_label);
    window.localStorage.setItem(
      "zahi_drive_location_coords",
      JSON.stringify({
        latitude: payload.current_latitude,
        longitude: payload.current_longitude,
      })
    );
  } catch {
    // Local storage is only a convenience for pre-filling future forms.
  }
};
export const buildProfileDraft = (driver = {}) => {
  const d = driver || {};
  return {
    full_name: d.full_name || "",
    phone: d.phone || "",
    aadhaar_number: d.aadhaar_number || "",
    license_number: d.license_number || "",
    emergency_contact_name: d.emergency_contact_name || "",
    emergency_contact_phone: d.emergency_contact_phone || "",
  };
};

export const buildVehicleDraft = (vehicle = {}) => {
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
  };
};

export const getDriverSetupStatus = (driver = {}) => {
  const vehicle = driver?.vehicle;
  const profileReady = hasText(driver?.full_name) && hasText(driver?.phone);
  const vehicleReady = Boolean(
    vehicle &&
      hasText(vehicle.vehicle_name) &&
      hasText(vehicle.plate_number) &&
      Number(vehicle.seat_capacity || 0) > 0
  );
  const locationReady =
    Number.isFinite(Number(driver?.current_latitude)) &&
    Number.isFinite(Number(driver?.current_longitude));
  const setupIssues = [];

  if (!profileReady) {
    setupIssues.push("Complete My Profile before setting your service location.");
  }
  if (!vehicleReady) {
    setupIssues.push("Add My Vehicle before setting your service location.");
  }

  return {
    profileReady,
    vehicleReady,
    locationReady,
    canSetLocation: profileReady && vehicleReady,
    setupIssues,
  };
};

const DashboardContext = createContext(null);

export const DashboardProvider = ({ children }) => {
  const { user: driver, applySession } = useAuth();
  const setupStatus = getDriverSetupStatus(driver);
  const profileDirtyRef = useRef(false);
  const vehicleDirtyRef = useRef(false);

  const [dashboard, setDashboard] = useState(null);
  const [rideRequests, setRideRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [acceptingRideId, setAcceptingRideId] = useState(null);

  const [profileForm, setProfileFormState] = useState(() => buildProfileDraft(driver));
  const [vehicleForm, setVehicleFormState] = useState(() => buildVehicleDraft(driver?.vehicle));
  const [profileAssets, setProfileAssetsState] = useState({
    profile_photo_url: driver?.profile_photo_url || null,
    aadhaar_image_url: driver?.aadhaar_image_url || null,
    license_image_url: driver?.license_image_url || null,
  });
  const [vehicleAssets, setVehicleAssetsState] = useState({
    photo_url: driver?.vehicle?.photo_url || null,
    rc_image_url: driver?.vehicle?.rc_image_url || null,
    insurance_image_url: driver?.vehicle?.insurance_image_url || null,
    photo_urls: normalizeUrlList(driver?.vehicle?.photo_urls, driver?.vehicle?.photo_url),
    rc_image_urls: normalizeUrlList(driver?.vehicle?.rc_image_urls, driver?.vehicle?.rc_image_url),
    insurance_image_urls: normalizeUrlList(driver?.vehicle?.insurance_image_urls, driver?.vehicle?.insurance_image_url),
  });
  const [profileFiles, setProfileFilesState] = useState({ profile_photo_url: null, aadhaar_image_url: null, license_image_url: null });
  const [vehicleFiles, setVehicleFilesState] = useState({ photo_urls: [], rc_image_urls: [], insurance_image_urls: [] });

  const setProfileForm = (updater) => {
    profileDirtyRef.current = true;
    setProfileFormState(updater);
  };

  const setVehicleForm = (updater) => {
    vehicleDirtyRef.current = true;
    setVehicleFormState(updater);
  };

  const setProfileAssets = (updater) => {
    profileDirtyRef.current = true;
    setProfileAssetsState(updater);
  };

  const setVehicleAssets = (updater) => {
    vehicleDirtyRef.current = true;
    setVehicleAssetsState(updater);
  };

  const setProfileFiles = (updater) => {
    profileDirtyRef.current = true;
    setProfileFilesState(updater);
  };

  const setVehicleFiles = (updater) => {
    vehicleDirtyRef.current = true;
    setVehicleFilesState(updater);
  };

  const hydrateDriverState = (nextDriver, { preserveDirtyForms = false } = {}) => {
    applySession({ driver: nextDriver }, { preserveAccess: true });

    if (!preserveDirtyForms || !profileDirtyRef.current) {
      setProfileFormState(buildProfileDraft(nextDriver));
      setProfileAssetsState({
        profile_photo_url: nextDriver?.profile_photo_url || null,
        aadhaar_image_url: nextDriver?.aadhaar_image_url || null,
        license_image_url: nextDriver?.license_image_url || null,
      });
      setProfileFilesState({ profile_photo_url: null, aadhaar_image_url: null, license_image_url: null });
      profileDirtyRef.current = false;
    }

    if (!preserveDirtyForms || !vehicleDirtyRef.current) {
      setVehicleFormState(buildVehicleDraft(nextDriver?.vehicle));
      setVehicleAssetsState({
        photo_url: nextDriver?.vehicle?.photo_url || null,
        rc_image_url: nextDriver?.vehicle?.rc_image_url || null,
        insurance_image_url: nextDriver?.vehicle?.insurance_image_url || null,
        photo_urls: normalizeUrlList(nextDriver?.vehicle?.photo_urls, nextDriver?.vehicle?.photo_url),
        rc_image_urls: normalizeUrlList(nextDriver?.vehicle?.rc_image_urls, nextDriver?.vehicle?.rc_image_url),
        insurance_image_urls: normalizeUrlList(nextDriver?.vehicle?.insurance_image_urls, nextDriver?.vehicle?.insurance_image_url),
      });
      setVehicleFilesState({ photo_urls: [], rc_image_urls: [], insurance_image_urls: [] });
      vehicleDirtyRef.current = false;
    }
  };

  useEffect(() => {
    let alive = true;
    const loadAll = async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const [dash, rides] = await Promise.all([
          mobilityService.getDashboard(),
          mobilityService.getRideRequests(20),
        ]);
        if (!alive) return;
        setDashboard(dash);
        setRideRequests(rides);
        hydrateDriverState(dash.driver, { preserveDirtyForms: true });
      } catch {
        if (alive) toast.error("Failed to load dashboard data.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    loadAll();
    const intervalId = window.setInterval(() => loadAll(true), 5000);
    return () => {
      alive = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const refreshDashboardData = async ({ preserveDirtyForms = true } = {}) => {
    const [dash, rides] = await Promise.all([
      mobilityService.getDashboard(),
      mobilityService.getRideRequests(20),
    ]);
    setDashboard(dash);
    setRideRequests(Array.isArray(rides) ? rides : []);
    hydrateDriverState(dash.driver, { preserveDirtyForms });
    return { dash, rides };
  };

  const uploadFiles = async (filesMap) => {
    const uploaded = {};
    for (const [key, value] of Object.entries(filesMap)) {
      const files = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
      if (files.length) {
        const urls = [];
        for (const file of files) {
          const result = await mobilityService.uploadImage(file);
          urls.push(result.url);
        }
        uploaded[key] = Array.isArray(value) ? urls : urls[0];
      }
    }
    return uploaded;
  };

  const saveProfile = async () => {
    if (!emptyToNull(profileForm.full_name) || !emptyToNull(profileForm.phone)) {
      toast.error("Full name and phone number are required.");
      return;
    }

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
        ...Object.fromEntries(Object.entries({ ...profileAssets, ...uploads }).map(([k, v]) => [k, v || null])),
      };
      const updated = await mobilityService.updateProfile(payload);
      hydrateDriverState(updated);
      toast.success("Profile updated!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const saveVehicle = async () => {
    if (!emptyToNull(vehicleForm.vehicle_name) || !emptyToNull(vehicleForm.plate_number)) {
      toast.error("Vehicle name and plate number are required.");
      return;
    }

    setSavingVehicle(true);
    try {
      const uploads = await uploadFiles(vehicleFiles);
      const photoUrls = mergeUrlLists(vehicleAssets.photo_urls, uploads.photo_urls);
      const rcImageUrls = mergeUrlLists(vehicleAssets.rc_image_urls, uploads.rc_image_urls);
      const insuranceImageUrls = mergeUrlLists(vehicleAssets.insurance_image_urls, uploads.insurance_image_urls);
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
        photo_url: photoUrls[0] || null,
        rc_image_url: rcImageUrls[0] || null,
        insurance_image_url: insuranceImageUrls[0] || null,
        photo_urls: photoUrls,
        rc_image_urls: rcImageUrls,
        insurance_image_urls: insuranceImageUrls,
      };
      const updated = await mobilityService.updateVehicle(payload);
      hydrateDriverState(updated);
      toast.success("Vehicle updated!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save vehicle.");
    } finally {
      setSavingVehicle(false);
    }
  };

  const updateDriverLocation = async (place) => {
    if (!setupStatus.canSetLocation) {
      toast.error(setupStatus.setupIssues[0] || "Complete your profile and vehicle first.");
      return false;
    }

    const payload = buildLocationPayload(place);
    if (!payload) {
      toast.error("Select a location from the suggestions.");
      return false;
    }

    setUpdatingLocation(true);
    try {
      const updated = await mobilityService.updateProfile(payload);
      rememberLocation(payload);
      hydrateDriverState(updated);
      setDashboard((current) => (current ? { ...current, driver: updated } : current));
      const rides = await mobilityService.getRideRequests(20);
      setRideRequests(Array.isArray(rides) ? rides : []);
      toast.success("Location updated. Requests are filtered within 30 km.");
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update location.");
      return false;
    } finally {
      setUpdatingLocation(false);
    }
  };

  const acceptRideRequest = async (rideId) => {
    if (!rideId || acceptingRideId) return;

    setAcceptingRideId(rideId);
    try {
      const response = await mobilityService.acceptRideRequest(rideId);
      await refreshDashboardData();
      toast.success(`Ride accepted${response?.ride_request?.customer_name ? ` for ${response.ride_request.customer_name}` : ""}.`);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not accept this ride.");
      try {
        await refreshDashboardData();
      } catch {
        // Keep the original accept error visible.
      }
    } finally {
      setAcceptingRideId(null);
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
      setupStatus,
      profileForm, setProfileForm,
      vehicleForm, setVehicleForm,
      profileAssets, setProfileAssets,
      vehicleAssets, setVehicleAssets,
      profileFiles, setProfileFiles,
      vehicleFiles, setVehicleFiles,
      savingProfile, savingVehicle, updatingLocation, acceptingRideId,
      saveProfile, saveVehicle,
      updateDriverLocation, acceptRideRequest, refreshDashboardData,
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
