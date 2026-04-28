import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, CheckCircle2, LocateFixed, MapPin, RefreshCcw, Save } from "lucide-react";
import toast from "react-hot-toast";
import PlaceAutocompleteInput from "../../components/PlaceAutocompleteInput";
import { useDashboard } from "../../context/DashboardContext";
import useDriverLocation from "../../hooks/useDriverLocation";

const coordinatesFromSuggestion = (suggestion) => {
  const latitude = Number(suggestion?.latitude);
  const longitude = Number(suggestion?.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return { latitude, longitude };
};

const formatCoordinate = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number.toFixed(5) : "--";
};

const LocationPage = () => {
  const { driver, theme, setupStatus, updatingLocation, updateDriverLocation } = useDashboard();
  const { status, requestLocation } = useDriverLocation(false);
  const isDark = theme === "dark";

  const [locationDraft, setLocationDraft] = useState(driver?.current_area_label || "");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    setLocationDraft(driver?.current_area_label || "");
    setSelectedPlace(null);
  }, [driver?.current_area_label]);

  const hasSavedCoordinates = useMemo(
    () => Number.isFinite(Number(driver?.current_latitude)) && Number.isFinite(Number(driver?.current_longitude)),
    [driver?.current_latitude, driver?.current_longitude]
  );

  const locationLocked = !setupStatus.canSetLocation;
  const readyForRequests = setupStatus.canSetLocation && hasSavedCoordinates;

  const inputClass = `field-input pr-11 disabled:cursor-not-allowed disabled:opacity-60 ${
    isDark ? "bg-zinc-800 border-zinc-700 text-zinc-100" : "bg-white border-slate-200 text-slate-900"
  }`;

  const handleSelectLocation = (suggestion) => {
    const coordinates = coordinatesFromSuggestion(suggestion);
    const label = suggestion.shortLabel || suggestion.label || "";
    setLocationDraft(label);
    setSelectedPlace(coordinates ? { label, ...coordinates } : null);
  };

  const handleSaveLocation = async () => {
    if (locationLocked) {
      toast.error(setupStatus.setupIssues[0] || "Complete your profile and vehicle first.");
      return;
    }

    const saved = await updateDriverLocation(selectedPlace);
    if (saved) setSelectedPlace(null);
  };

  const handleUseCurrentLocation = async () => {
    if (locationLocked) {
      toast.error(setupStatus.setupIssues[0] || "Complete your profile and vehicle first.");
      return;
    }

    setDetecting(true);
    try {
      const result = await requestLocation();
      if (!result?.coordinates) {
        toast.error("Could not get current location.");
        return;
      }

      const payload = {
        label: result.label,
        latitude: result.coordinates.latitude,
        longitude: result.coordinates.longitude,
      };
      setLocationDraft(result.label || "");
      setSelectedPlace(payload);
      const saved = await updateDriverLocation(payload);
      if (saved) setSelectedPlace(null);
    } finally {
      setDetecting(false);
    }
  };

  return (
    <div className="space-y-8 fade-up">
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>Location</p>
        <h1 className={`mt-1 font-display text-3xl font-bold ${isDark ? "text-white" : "text-slate-900"}`}>Service Location</h1>
        <p className={`mt-1 text-sm ${isDark ? "text-zinc-500" : "text-slate-500"}`}>Paid cab requests are matched within 30 km only after this location is saved.</p>
      </div>

      {locationLocked ? (
        <div className={`rounded-2xl border p-5 ${isDark ? "border-amber-400/25 bg-amber-400/10" : "border-amber-200 bg-amber-50"}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <AlertCircle className={`mt-0.5 h-5 w-5 shrink-0 ${isDark ? "text-amber-300" : "text-amber-700"}`} />
              <div>
                <p className={`text-sm font-bold ${isDark ? "text-amber-100" : "text-amber-900"}`}>Finish setup before setting location</p>
                <p className={`mt-1 text-sm ${isDark ? "text-amber-100/70" : "text-amber-800"}`}>
                  Complete My Profile and My Vehicle first. Then you can save your service location and receive requests.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {!setupStatus.profileReady ? (
                <Link to="/dashboard/profile" className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-zinc-950 text-amber-200" : "bg-white text-amber-800 shadow-sm"}`}>
                  My Profile
                </Link>
              ) : null}
              {!setupStatus.vehicleReady ? (
                <Link to="/dashboard/vehicle" className={`rounded-xl px-4 py-2 text-sm font-bold ${isDark ? "bg-zinc-950 text-amber-200" : "bg-white text-amber-800 shadow-sm"}`}>
                  My Vehicle
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <div className={`rounded-2xl border p-5 ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${isDark ? "bg-[#facc15]/10 text-[#facc15]" : "bg-amber-50 text-amber-600"}`}>
              <MapPin size={24} />
            </div>
            <div className="min-w-0">
              <p className={`text-xs font-bold uppercase tracking-widest ${isDark ? "text-zinc-500" : "text-slate-400"}`}>Current saved area</p>
              <p className={`mt-1 truncate text-lg font-bold ${isDark ? "text-white" : "text-slate-900"}`}>
                {driver?.current_area_label || "Location not set"}
              </p>
              <p className={`mt-1 text-xs ${isDark ? "text-zinc-500" : "text-slate-500"}`}>
                {hasSavedCoordinates
                  ? `${formatCoordinate(driver.current_latitude)}, ${formatCoordinate(driver.current_longitude)}`
                  : "Choose a suggested place or use current location"}
              </p>
            </div>
          </div>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${readyForRequests ? isDark ? "bg-emerald-500/15 text-emerald-300" : "bg-emerald-50 text-emerald-700" : isDark ? "bg-amber-500/15 text-amber-300" : "bg-amber-50 text-amber-700"}`}>
            {readyForRequests ? <CheckCircle2 size={14} /> : <MapPin size={14} />}
            {readyForRequests ? "Ready for requests" : locationLocked ? "Profile and vehicle needed" : "Location needed"}
          </span>
        </div>
      </div>

      <div className={`space-y-5 rounded-2xl border p-6 ${isDark ? "bg-zinc-900 border-zinc-800/60" : "bg-white border-slate-200 shadow-sm"}`}>
        <p className={`border-b pb-3 text-xs font-bold uppercase tracking-widest ${isDark ? "text-zinc-500 border-zinc-800" : "text-slate-400 border-slate-100"}`}>Update Area</p>

        <label className="block">
          <span className={`field-label ${isDark ? "text-zinc-400" : "text-slate-500"}`}>Search Location</span>
          <PlaceAutocompleteInput
            value={locationDraft}
            onChange={(value) => {
              setLocationDraft(value);
              setSelectedPlace(null);
            }}
            onSelect={handleSelectLocation}
            placeholder="Type area, town, landmark"
            className={inputClass}
            disabled={locationLocked}
          />
        </label>

        {selectedPlace ? (
          <div className={`rounded-2xl border px-4 py-3 ${isDark ? "border-zinc-800 bg-zinc-950 text-zinc-300" : "border-slate-200 bg-slate-50 text-slate-600"}`}>
            <p className="text-xs font-bold uppercase tracking-widest">Selected area</p>
            <p className={`mt-1 text-sm font-semibold ${isDark ? "text-white" : "text-slate-900"}`}>{selectedPlace.label}</p>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locationLocked || detecting || updatingLocation}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-bold transition-colors disabled:opacity-60 ${
              isDark ? "border-zinc-700 bg-zinc-800 text-zinc-100 hover:bg-zinc-700" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {detecting || status === "loading" ? <RefreshCcw size={16} className="animate-spin" /> : <LocateFixed size={16} />}
            {detecting || status === "loading" ? "Getting current location" : "Use current location"}
          </button>

          <button
            type="button"
            onClick={handleSaveLocation}
            disabled={locationLocked || !selectedPlace || updatingLocation}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#facc15] px-6 py-3 text-sm font-bold text-zinc-900 transition-colors hover:bg-[#eab308] disabled:opacity-60"
          >
            {updatingLocation ? <RefreshCcw size={16} className="animate-spin" /> : <Save size={16} />}
            {updatingLocation ? "Updating..." : "Update Location"}
          </button>
        </div>

        {status === "denied" ? (
          <p className="text-sm font-semibold text-amber-600">Location permission is blocked in the browser.</p>
        ) : null}
        {status === "unsupported" ? (
          <p className="text-sm font-semibold text-amber-600">Current location is not supported on this browser.</p>
        ) : null}
      </div>
    </div>
  );
};

export default LocationPage;
