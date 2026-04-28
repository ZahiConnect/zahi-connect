import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowRight,
  CarFront,
  Eye,
  EyeOff,
  FileImage,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import useDriverLocation from "../../hooks/useDriverLocation";
import AuthShell from "./AuthShell";
import mobilityService from "../../services/mobilityService";
import GoogleAuthButton from "../../components/GoogleAuthButton";
import PlaceAutocompleteInput from "../../components/PlaceAutocompleteInput";

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

const UploadItem = ({ label, file, onChange }) => (
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
    <p className="mt-2 text-xs text-slate-400">{file ? file.name : "No file selected"}</p>
  </label>
);

const RegisterPage = () => {
  const { applySession } = useAuth();
  const navigate = useNavigate();
  const {
    coordinates,
    locationLabel,
    status,
    requestLocation,
    setManualLocation,
  } = useDriverLocation(true);
  const lastAutoLocationLabelRef = useRef("");
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    aadhaar_number: "",
    license_number: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    current_area_label: "",
    vehicle_name: "",
    vehicle_type: "Cab",
    brand: "",
    model: "",
    plate_number: "",
    color: "",
    year: "",
    seat_capacity: 4,
    availability_notes: "",
    air_conditioned: true,
  });
  const [files, setFiles] = useState({
    profile_photo_url: null,
    aadhaar_image_url: null,
    license_image_url: null,
    photo_url: null,
    rc_image_url: null,
    insurance_image_url: null,
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [selectedOperatingPlace, setSelectedOperatingPlace] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!locationLabel) return;
    setForm((current) => {
      const shouldReplaceOperatingArea =
        !current.current_area_label ||
        current.current_area_label === lastAutoLocationLabelRef.current;
      if (!shouldReplaceOperatingArea) return current;
      lastAutoLocationLabelRef.current = locationLabel;
      return { ...current, current_area_label: locationLabel };
    });
  }, [locationLabel]);

  const fileCount = useMemo(
    () => Object.values(files).filter(Boolean).length,
    [files]
  );

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleOperatingAreaChange = (value) => {
    setSelectedOperatingPlace(null);
    setField("current_area_label", value);
  };

  const handleOperatingAreaSelect = (suggestion) => {
    const label = suggestion.shortLabel || suggestion.label;
    setSelectedOperatingPlace({
      label,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
    setField("current_area_label", label);
    setManualLocation(suggestion);
  };

  const handleUseCurrentLocation = async () => {
    const updated = await requestLocation();
    if (updated) {
      setSelectedOperatingPlace(null);
      setField("current_area_label", updated.label || locationLabel || "");
    }
  };

  const uploadSelectedFiles = async () => {
    const uploaded = {};
    for (const [key, file] of Object.entries(files)) {
      if (!file) continue;
      const response = await mobilityService.uploadImage(file);
      uploaded[key] = response.url;
    }
    return uploaded;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!form.vehicle_name || !form.plate_number) {
      setError("Add at least the vehicle name and plate number.");
      return;
    }

    setLoading(true);
    try {
      const uploaded = await uploadSelectedFiles();
      const operatingCoordinates = selectedOperatingPlace || coordinates;
      const response = await mobilityService.registerDriver({
        full_name: form.full_name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        aadhaar_number: emptyToNull(form.aadhaar_number),
        aadhaar_image_url: uploaded.aadhaar_image_url || null,
        license_number: emptyToNull(form.license_number),
        license_image_url: uploaded.license_image_url || null,
        profile_photo_url: uploaded.profile_photo_url || null,
        emergency_contact_name: emptyToNull(form.emergency_contact_name),
        emergency_contact_phone: emptyToNull(form.emergency_contact_phone),
        current_area_label: emptyToNull(form.current_area_label) || locationLabel || null,
        current_latitude: operatingCoordinates?.latitude ?? null,
        current_longitude: operatingCoordinates?.longitude ?? null,
        vehicle: {
          vehicle_name: form.vehicle_name,
          vehicle_type: form.vehicle_type,
          brand: emptyToNull(form.brand),
          model: emptyToNull(form.model),
          plate_number: form.plate_number,
          color: emptyToNull(form.color),
          year: parseInteger(form.year),
          seat_capacity: parseInteger(form.seat_capacity, 4) || 4,
          air_conditioned: Boolean(form.air_conditioned),
          photo_url: uploaded.photo_url || null,
          rc_image_url: uploaded.rc_image_url || null,
          insurance_image_url: uploaded.insurance_image_url || null,
          availability_notes: emptyToNull(form.availability_notes),
        },
      });

      applySession(response);
      toast.success("Driver account created. Welcome to Zahi Drive.");
      navigate("/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "We could not create your driver account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Fleet onboarding made simple"
      title="Register yourself and your cab."
      description="Add your Aadhaar, licence, vehicle photos, and accurate operating location once. Zahi uses those details to match paid cab requests."
      footer={
        <p>
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-amber-600">
            Sign in instead
          </Link>
        </p>
      }
    >
      <div className="fade-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-900 mb-4">
          <div className="w-1.5 h-1.5 rounded-full bg-[#facc15]" /> Operator Onboarding
        </span>
        <h2 className="font-display mt-2 text-4xl font-bold tracking-tight text-zinc-900">Create your Zahi Drive profile</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-500 font-medium">
          No monthly product fee. Your cab profile is used for customer-paid request matching.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-12 space-y-12 fade-up">
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="field-section-icon">
              <UserRound className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Driver details</p>
              <h3 className="font-display text-2xl font-bold text-zinc-900">Personal and compliance</h3>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Full name</span>
              <input
                type="text"
                value={form.full_name}
                onChange={(event) => setField("full_name", event.target.value)}
                placeholder="Driver full name"
                className="field-input"
                required
              />
            </label>

            <label className="block">
              <span className="field-label">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setField("email", event.target.value)}
                placeholder="driver@example.com"
                className="field-input"
                required
              />
            </label>

            <label className="block">
              <span className="field-label">Phone</span>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => setField("phone", event.target.value)}
                placeholder="+91 98765 43210"
                className="field-input"
                required
              />
            </label>

            <label className="block">
              <span className="field-label">Aadhaar number</span>
              <input
                type="text"
                value={form.aadhaar_number}
                onChange={(event) => setField("aadhaar_number", event.target.value)}
                placeholder="Aadhaar number"
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Driving licence number</span>
              <input
                type="text"
                value={form.license_number}
                onChange={(event) => setField("license_number", event.target.value)}
                placeholder="Licence number"
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Current operating area</span>
              <PlaceAutocompleteInput
                value={form.current_area_label}
                onChange={handleOperatingAreaChange}
                onSelect={handleOperatingAreaSelect}
                placeholder="Search exact area, landmark, or town"
                className="field-input"
              />
              <p className="mt-2 text-xs font-medium leading-5 text-slate-400">
                Pick a suggestion to save accurate driver coordinates.
              </p>
            </label>

            <label className="block">
              <span className="field-label">Emergency contact name</span>
              <input
                type="text"
                value={form.emergency_contact_name}
                onChange={(event) => setField("emergency_contact_name", event.target.value)}
                placeholder="Emergency contact"
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Emergency contact phone</span>
              <input
                type="tel"
                value={form.emergency_contact_phone}
                onChange={(event) => setField("emergency_contact_phone", event.target.value)}
                placeholder="+91 98765 43210"
                className="field-input"
              />
            </label>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            <UploadItem
              label="Profile photo"
              file={files.profile_photo_url}
              onChange={(file) => setFiles((current) => ({ ...current, profile_photo_url: file }))}
            />
            <UploadItem
              label="Aadhaar image"
              file={files.aadhaar_image_url}
              onChange={(file) => setFiles((current) => ({ ...current, aadhaar_image_url: file }))}
            />
            <UploadItem
              label="Licence image"
              file={files.license_image_url}
              onChange={(file) => setFiles((current) => ({ ...current, license_image_url: file }))}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="field-section-icon yellow">
              <CarFront className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Cab details</p>
              <h3 className="font-display text-2xl font-bold text-zinc-900">Vehicle setup</h3>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Vehicle name</span>
              <input
                type="text"
                value={form.vehicle_name}
                onChange={(event) => setField("vehicle_name", event.target.value)}
                placeholder="Swift Dzire, Innova, Sedan"
                className="field-input"
                required
              />
            </label>

            <label className="block">
              <span className="field-label">Vehicle type</span>
              <input
                type="text"
                value={form.vehicle_type}
                onChange={(event) => setField("vehicle_type", event.target.value)}
                placeholder="Cab"
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Brand</span>
              <input
                type="text"
                value={form.brand}
                onChange={(event) => setField("brand", event.target.value)}
                placeholder="Maruti, Toyota"
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Model</span>
              <input
                type="text"
                value={form.model}
                onChange={(event) => setField("model", event.target.value)}
                placeholder="2024 model"
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Plate number</span>
              <input
                type="text"
                value={form.plate_number}
                onChange={(event) => setField("plate_number", event.target.value.toUpperCase())}
                placeholder="TN01AB1234"
                className="field-input uppercase"
                required
              />
            </label>

            <label className="block">
              <span className="field-label">Color</span>
              <input
                type="text"
                value={form.color}
                onChange={(event) => setField("color", event.target.value)}
                placeholder="White"
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Year</span>
              <input
                type="number"
                value={form.year}
                onChange={(event) => setField("year", event.target.value)}
                placeholder="2024"
                className="field-input"
              />
            </label>

            <label className="block">
              <span className="field-label">Seat capacity</span>
              <input
                type="number"
                min="1"
                max="12"
                value={form.seat_capacity}
                onChange={(event) => setField("seat_capacity", event.target.value)}
                className="field-input"
              />
            </label>

          </div>

          <label className="block">
            <span className="field-label">Availability notes</span>
            <textarea
              value={form.availability_notes}
              onChange={(event) => setField("availability_notes", event.target.value)}
              rows={3}
              placeholder="Airport route, luggage capacity, local coverage"
              className="field-input"
            />
          </label>

          <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-500">
            <input
              type="checkbox"
              checked={form.air_conditioned}
              onChange={(event) => setField("air_conditioned", event.target.checked)}
              className="h-4 w-4 rounded border-slate-200"
            />
            Air conditioned
          </label>

          <div className="grid gap-6 sm:grid-cols-3">
            <UploadItem
              label="Vehicle photo"
              file={files.photo_url}
              onChange={(file) => setFiles((current) => ({ ...current, photo_url: file }))}
            />
            <UploadItem
              label="RC image"
              file={files.rc_image_url}
              onChange={(file) => setFiles((current) => ({ ...current, rc_image_url: file }))}
            />
            <UploadItem
              label="Insurance image"
              file={files.insurance_image_url}
              onChange={(file) => setFiles((current) => ({ ...current, insurance_image_url: file }))}
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="grid gap-6 sm:grid-cols-2">
            <label className="block">
              <span className="field-label">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(event) => setField("password", event.target.value)}
                  placeholder="At least 6 characters"
                  className="field-input"
                  style={{ paddingRight: "3rem" }}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-zinc-900 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="field-label">Confirm password</span>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(event) => setField("confirmPassword", event.target.value)}
                  placeholder="Repeat your password"
                  className="field-input"
                  style={{ paddingRight: "3rem" }}
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-zinc-900 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {form.current_area_label ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-900">
                <MapPin className="h-3.5 w-3.5" />
                Selected area {form.current_area_label}
              </span>
            ) : null}

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={status === "loading"}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MapPin className="h-3.5 w-3.5" />
              {status === "loading" ? "Updating precise location" : "Use precise current location"}
            </button>

            <span className="rounded-full bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
              {fileCount} document{fileCount === 1 ? "" : "s"} selected
            </span>
          </div>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-amber-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full mt-2 items-center justify-center gap-2 rounded-2xl bg-zinc-900 px-6 py-4 text-sm font-bold text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70 hover:bg-zinc-800 shadow-xl shadow-black/10"
          >
            {loading ? "Creating account..." : "Create Driver Account"}
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs font-semibold tracking-widest uppercase text-slate-400">or sign up with</span>
            </div>
          </div>

          <GoogleAuthButton mode="signup" label="Register with Google" />
          <p className="text-center text-xs text-slate-400 mt-1">
            Google sign-up creates a partial account — complete your vehicle details in the dashboard.
          </p>
        </section>
      </form>
    </AuthShell>
  );
};

export default RegisterPage;
