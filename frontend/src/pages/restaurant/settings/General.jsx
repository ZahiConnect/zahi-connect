import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  HiOutlineCheckCircle,
  HiOutlineLocationMarker,
  HiOutlineSearch,
} from "react-icons/hi";

import restaurantService from "../../../services/restaurantService";
import { buildGeneralForm, Field, inputClassName, RestaurantSettingsShell } from "./shared";
import { useRestaurantSettingsPage } from "./useRestaurantSettingsPage";

const LOCATION_SEARCH_LIMIT = 5;

const numericFieldRules = {
  phone: 15,
  reservation_phone: 15,
  whatsapp_number: 15,
  postal_code: 10,
};

const cleanText = (value) => {
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

const keepDigitsOnly = (value, maxLength = 20) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, maxLength);

const buildAreaFromAddress = (address = {}) =>
  cleanText(
    address.suburb ||
      address.neighbourhood ||
      address.quarter ||
      address.city_district ||
      address.borough ||
      address.hamlet ||
      address.village ||
      address.town ||
      address.municipality ||
      address.county
  );

const buildCityFromAddress = (address = {}) =>
  cleanText(
    address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.state_district ||
      address.county
  );

const buildLocationSuggestion = (result) => {
  const address = result?.address || {};
  const latitude = Number.parseFloat(result?.lat);
  const longitude = Number.parseFloat(result?.lon);

  return {
    label: cleanText(result?.display_name),
    address: cleanText(result?.display_name),
    area_name: buildAreaFromAddress(address),
    city: buildCityFromAddress(address),
    state: cleanText(address.state),
    postal_code: keepDigitsOnly(address.postcode || "", 10),
    latitude: Number.isFinite(latitude) ? latitude : "",
    longitude: Number.isFinite(longitude) ? longitude : "",
    map_link:
      Number.isFinite(latitude) && Number.isFinite(longitude)
        ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
        : "",
  };
};

const buildLocationFromReverseGeocode = (payload, latitude, longitude) => {
  const locality = cleanText(payload?.locality);
  const city = cleanText(payload?.city || payload?.locality);
  const state = cleanText(payload?.principalSubdivision);
  const postcode = keepDigitsOnly(payload?.postcode || "", 10);
  const addressParts = [locality, city !== locality ? city : "", state, postcode]
    .filter(Boolean)
    .join(", ");

  return {
    label: addressParts || [city, state].filter(Boolean).join(", ") || "Current location",
    address: addressParts || [city, state].filter(Boolean).join(", "),
    area_name: locality || city,
    city,
    state,
    postal_code: postcode,
    latitude,
    longitude,
    map_link:
      latitude && longitude
        ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
        : "",
  };
};

const buildLocationQueryFromSettings = (settings) =>
  cleanText(settings?.tenant?.address) ||
  [settings?.profile?.area_name, settings?.profile?.city, settings?.profile?.state]
    .filter(Boolean)
    .join(", ");

const isAutoCoordinateMapLink = (value) =>
  cleanText(value).startsWith("https://www.google.com/maps/search/?api=1&query=");

const optionalText = (value) => {
  const text = cleanText(value);
  return text || null;
};

const optionalCoordinate = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const buildGeneralPayload = (form) => ({
  name: cleanText(form.name),
  email: cleanText(form.email),
  phone: optionalText(form.phone),
  address: optionalText(form.address),
  tagline: optionalText(form.tagline),
  description: optionalText(form.description),
  area_name: optionalText(form.area_name),
  city: optionalText(form.city),
  state: optionalText(form.state),
  postal_code: optionalText(form.postal_code),
  map_link: optionalText(form.map_link),
  latitude: optionalCoordinate(form.latitude),
  longitude: optionalCoordinate(form.longitude),
  contact_email: optionalText(form.contact_email),
  reservation_phone: optionalText(form.reservation_phone),
  whatsapp_number: optionalText(form.whatsapp_number),
});

const getApiErrorMessage = (error, fallback) => {
  const detail = error.response?.data?.detail;

  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || item?.message || String(item))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail === "object") {
    return detail.msg || detail.message || fallback;
  }

  return fallback;
};

export default function RestaurantGeneralSettings() {
  const { settings, loading, hydrate } = useRestaurantSettingsPage();
  const [form, setForm] = useState(buildGeneralForm(null));
  const [saving, setSaving] = useState(false);
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [searchingLocations, setSearchingLocations] = useState(false);
  const [detectingLocation, setDetectingLocation] = useState(false);

  useEffect(() => {
    setForm(buildGeneralForm(settings));
    setLocationQuery(buildLocationQueryFromSettings(settings));
  }, [settings]);

  const updateField = (field) => (event) => {
    const limit = numericFieldRules[field];
    const value = limit
      ? keepDigitsOnly(event.target.value, limit)
      : event.target.value;

    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateManualLocationField = (field) => (event) => {
    const limit = numericFieldRules[field];
    const value = limit
      ? keepDigitsOnly(event.target.value, limit)
      : event.target.value;

    setForm((current) => ({
      ...current,
      [field]: value,
      map_link: isAutoCoordinateMapLink(current.map_link) ? "" : current.map_link,
      latitude: "",
      longitude: "",
    }));
  };

  useEffect(() => {
    const query = locationQuery.trim();
    if (query.length < 3) {
      setLocationSuggestions([]);
      setSearchingLocations(false);
      return undefined;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      try {
        setSearchingLocations(true);
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${LOCATION_SEARCH_LIMIT}&q=${encodeURIComponent(
            query
          )}`,
          { signal: controller.signal }
        );
        const payload = await response.json();
        if (!Array.isArray(payload)) {
          setLocationSuggestions([]);
          return;
        }
        setLocationSuggestions(payload.map(buildLocationSuggestion));
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Failed to load location suggestions", error);
          setLocationSuggestions([]);
        }
      } finally {
        setSearchingLocations(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [locationQuery]);

  const applyLocationSuggestion = (suggestion) => {
    setForm((current) => ({
      ...current,
      address: suggestion.address || "",
      area_name: suggestion.area_name || "",
      city: suggestion.city || "",
      state: suggestion.state || "",
      postal_code: suggestion.postal_code || "",
      latitude: suggestion.latitude ?? "",
      longitude: suggestion.longitude ?? "",
      map_link: suggestion.map_link || "",
    }));
    setLocationQuery(suggestion.label || "");
    setLocationSuggestions([]);
  };

  const detectCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast.error("Location detection is not supported in this browser.");
      return;
    }

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=en`
          );
          const payload = await response.json();
          const location = buildLocationFromReverseGeocode(
            payload,
            coords.latitude,
            coords.longitude
          );
          applyLocationSuggestion(location);
          toast.success("Current location detected.");
        } catch (error) {
          console.error("Failed to resolve current location", error);
          toast.error("Could not resolve your current location.");
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        console.error("Location detection failed", error);
        toast.error("Could not detect your current location.");
        setDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const saveGeneral = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      hydrate(await restaurantService.updateSettingsGeneral(buildGeneralPayload(form)));
      toast.success("General settings saved.");
    } catch (error) {
      console.error("Failed to save restaurant settings", error);
      toast.error(getApiErrorMessage(error, "Could not save general settings."));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="space-y-6">
        <div className="h-44 animate-pulse rounded-[30px] bg-[#F4ECE2]" />
        <div className="grid gap-6 xl:grid-cols-[1.28fr_0.72fr]">
          <div className="h-[38rem] animate-pulse rounded-[30px] bg-[#F7F1EA]" />
          <div className="h-[38rem] animate-pulse rounded-[30px] bg-[#F7F1EA]" />
        </div>
      </div>
    );
  }

  return (
    <RestaurantSettingsShell
      sectionLabel="Settings - General"
      title="Business identity and location details."
      description="Keep the restaurant name, address, contact details, and public-facing description clean and up to date."
      settings={settings}
    >
      <form onSubmit={saveGeneral} className="space-y-6">
        <div className="mb-6">
          <h2 className="text-2xl font-serif text-[#201711]">General</h2>
          <p className="mt-2 text-sm leading-7 text-[#6D5A4B]">
            These details shape how the workspace and customer marketplace identify your restaurant.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Restaurant name">
            <input className={inputClassName} value={form.name} onChange={updateField("name")} />
          </Field>
          <Field label="Workspace email">
            <input className={inputClassName} type="email" value={form.email} onChange={updateField("email")} />
          </Field>
          <Field label="Workspace phone">
            <input
              className={inputClassName}
              value={form.phone}
              onChange={updateField("phone")}
              inputMode="numeric"
              maxLength={15}
              placeholder="Numbers only"
            />
          </Field>
          <Field label="Reservation phone">
            <input
              className={inputClassName}
              value={form.reservation_phone}
              onChange={updateField("reservation_phone")}
              inputMode="numeric"
              maxLength={15}
              placeholder="Numbers only"
            />
          </Field>
          <Field label="Customer care email">
            <input className={inputClassName} type="email" value={form.contact_email} onChange={updateField("contact_email")} />
          </Field>
          <Field label="WhatsApp number">
            <input
              className={inputClassName}
              value={form.whatsapp_number}
              onChange={updateField("whatsapp_number")}
              inputMode="numeric"
              maxLength={15}
              placeholder="Numbers only"
            />
          </Field>
        </div>

        <div className="rounded-[26px] border border-[#E7DCCE] bg-[#FCF7F1] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#201711]">Location picker</p>
              <p className="mt-2 text-sm leading-7 text-[#6D5A4B]">
                Search once and choose a suggestion, or use the device location to autofill the
                fields. You can still edit the address, area, city, state, postal code, and map
                link below.
              </p>
            </div>
            <button
              type="button"
              onClick={detectCurrentLocation}
              disabled={detectingLocation}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D8CBBB] bg-white px-4 py-2.5 text-sm font-semibold text-[#3A2C21] transition hover:bg-[#FBF6F0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <HiOutlineLocationMarker className="text-base" />
              {detectingLocation ? "Detecting..." : "Use current location"}
            </button>
          </div>

          <div className="relative mt-5">
            <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#A07D64]">
              <HiOutlineSearch className="text-base" />
            </div>
            <input
              className={`${inputClassName} pl-11`}
              value={locationQuery}
              onChange={(event) => setLocationQuery(event.target.value)}
              placeholder="Search for a location suggestion"
            />
            {searchingLocations ? (
              <p className="mt-2 text-xs font-medium uppercase tracking-[0.16em] text-[#9C7A61]">
                Searching locations...
              </p>
            ) : null}

            {locationSuggestions.length > 0 ? (
              <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-[22px] border border-[#E4D8CC] bg-white shadow-[0_24px_50px_rgba(74,48,29,0.12)]">
                {locationSuggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.label}-${suggestion.map_link}`}
                    type="button"
                    onClick={() => applyLocationSuggestion(suggestion)}
                    className="block w-full border-b border-[#F0E6DB] px-4 py-3 text-left transition hover:bg-[#FBF6F0] last:border-b-0"
                  >
                    <p className="text-sm font-semibold text-[#201711]">{suggestion.label}</p>
                    <p className="mt-1 text-xs text-[#7A6658]">
                      {[suggestion.area_name, suggestion.city, suggestion.state]
                        .filter(Boolean)
                        .join(", ") || "Select this result"}
                    </p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <Field label="Full address">
          <input
            className={inputClassName}
            value={form.address}
            onChange={updateManualLocationField("address")}
            placeholder="Type the full restaurant address"
          />
        </Field>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Area">
            <input
              className={inputClassName}
              value={form.area_name}
              onChange={updateManualLocationField("area_name")}
              placeholder="Area or locality"
            />
          </Field>
          <Field label="City">
            <input
              className={inputClassName}
              value={form.city}
              onChange={updateManualLocationField("city")}
              placeholder="City"
            />
          </Field>
          <Field label="State">
            <input
              className={inputClassName}
              value={form.state}
              onChange={updateManualLocationField("state")}
              placeholder="State"
            />
          </Field>
          <Field label="Postal code">
            <input
              className={inputClassName}
              value={form.postal_code}
              onChange={updateManualLocationField("postal_code")}
              inputMode="numeric"
              maxLength={10}
              placeholder="Postal code"
            />
          </Field>
        </div>

        <Field label="Google Maps link">
          <input
            className={inputClassName}
            value={form.map_link}
            onChange={updateField("map_link")}
            placeholder="Paste a Google Maps link"
          />
        </Field>

        <Field label="Short tagline">
          <input className={inputClassName} value={form.tagline} onChange={updateField("tagline")} />
        </Field>

        <Field label="Description">
          <textarea
            rows="5"
            className={inputClassName}
            value={form.description}
            onChange={updateField("description")}
          />
        </Field>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-[#1F1A17] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#382920] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <HiOutlineCheckCircle className="text-base" />
            {saving ? "Saving..." : "Save general settings"}
          </button>
        </div>
      </form>
    </RestaurantSettingsShell>
  );
}
