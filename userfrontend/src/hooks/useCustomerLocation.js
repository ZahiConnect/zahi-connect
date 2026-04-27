import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "zahi_customer_location_label";
const COORDINATES_STORAGE_KEY = "zahi_customer_location_coords";
const SOURCE_STORAGE_KEY = "zahi_customer_location_source";
const LOCATION_EVENT = "zahi:customer-location-changed";

const getStoredLocationSnapshot = () => ({
  locationLabel: window.localStorage.getItem(STORAGE_KEY) || "",
  coordinates: parseStoredCoordinates(),
  source: window.localStorage.getItem(SOURCE_STORAGE_KEY) || "",
});

const parseStoredCoordinates = () => {
  try {
    const payload = JSON.parse(window.localStorage.getItem(COORDINATES_STORAGE_KEY) || "null");
    const latitude = Number(payload?.latitude);
    const longitude = Number(payload?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }
    const accuracy = Number(payload?.accuracy);
    return {
      latitude,
      longitude,
      accuracy: Number.isFinite(accuracy) ? accuracy : null,
    };
  } catch {
    return null;
  }
};

const cleanAreaName = (value) =>
  String(value || "")
    .replace(
      /\b(municipality|corporation|district|taluk|taluka|block|village|panchayat|tehsil|subdistrict)\b/gi,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();

const uniqueParts = (parts) => {
  const seen = new Set();
  return parts
    .map(cleanAreaName)
    .filter(Boolean)
    .filter((part) => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const buildNominatimLabel = (payload) => {
  const address = payload?.address || {};
  const exactParts = uniqueParts([
    address.building,
    address.house_number && address.road
      ? `${address.house_number} ${address.road}`
      : address.road,
    address.neighbourhood,
    address.suburb,
    address.city_district,
    address.village,
    address.town,
    address.city,
    address.state_district,
    address.state,
    address.postcode,
  ]);

  if (exactParts.length) {
    return exactParts.slice(0, 4).join(", ");
  }

  return cleanAreaName(payload?.display_name);
};

const getMostSpecificAdministrativeArea = (payload) => {
  const administrative = [...(payload.localityInfo?.administrative || [])]
    .sort((left, right) => (right.order || 0) - (left.order || 0))
    .map((entry) => cleanAreaName(entry.name))
    .filter(Boolean);

  return administrative.find(
    (name) =>
      ![
        cleanAreaName(payload.countryName),
        cleanAreaName(payload.principalSubdivision),
        cleanAreaName(payload.city),
        cleanAreaName(payload.locality),
      ]
        .filter(Boolean)
        .includes(name)
  );
};

const buildLocationLabel = (payload) => {
  const mostSpecificArea = getMostSpecificAdministrativeArea(payload);
  const primary =
    mostSpecificArea ||
    cleanAreaName(payload.locality) ||
    cleanAreaName(payload.city) ||
    payload.principalSubdivision ||
    cleanAreaName(payload.localityInfo?.administrative?.find((item) => item.order === 5)?.name) ||
    payload.countryName;

  const secondaryCandidates = mostSpecificArea
    ? [cleanAreaName(payload.principalSubdivision), cleanAreaName(payload.countryName)].filter(Boolean)
    : [
        cleanAreaName(payload.locality),
        cleanAreaName(payload.city),
        cleanAreaName(payload.principalSubdivision),
        cleanAreaName(payload.countryName),
      ].filter(Boolean);

  const secondary = secondaryCandidates.find((value) => value !== primary) || null;

  return [primary, secondary].filter(Boolean).join(", ");
};

const reverseGeocode = async (latitude, longitude) => {
  const nominatimParams = new URLSearchParams({
    format: "jsonv2",
    addressdetails: "1",
    lat: String(latitude),
    lon: String(longitude),
    zoom: "18",
  });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${nominatimParams.toString()}`
    );
    if (response.ok) {
      const payload = await response.json();
      const label = buildNominatimLabel(payload);
      if (label) return label;
    }
  } catch {
    // Fall back to the secondary reverse geocoder below.
  }

  const fallbackParams = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: "en",
  });
  const fallbackResponse = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?${fallbackParams.toString()}`
  );

  if (!fallbackResponse.ok) {
    throw new Error("Location lookup failed");
  }

  const fallbackPayload = await fallbackResponse.json();
  return buildLocationLabel(fallbackPayload) || "Current location";
};

const persistLocation = ({ label, coordinates, source }) => {
  window.localStorage.setItem(STORAGE_KEY, label);
  window.localStorage.setItem(COORDINATES_STORAGE_KEY, JSON.stringify(coordinates));
  window.localStorage.setItem(SOURCE_STORAGE_KEY, source);
  window.dispatchEvent(
    new CustomEvent(LOCATION_EVENT, {
      detail: {
        locationLabel: label,
        coordinates,
        source,
      },
    })
  );
};

export const useCustomerLocation = (enabled = true) => {
  const [locationLabel, setLocationLabel] = useState(() => getStoredLocationSnapshot().locationLabel);
  const [coordinates, setCoordinates] = useState(() => getStoredLocationSnapshot().coordinates);
  const [source, setSource] = useState(() => getStoredLocationSnapshot().source);
  const [status, setStatus] = useState(locationLabel ? "ready" : "idle");
  const coordinatesRef = useRef(coordinates);
  const locationLabelRef = useRef(locationLabel);
  const sourceRef = useRef(source);
  const requestingRef = useRef(false);

  useEffect(() => {
    coordinatesRef.current = coordinates;
  }, [coordinates]);

  useEffect(() => {
    locationLabelRef.current = locationLabel;
  }, [locationLabel]);

  useEffect(() => {
    sourceRef.current = source;
  }, [source]);

  const applyLocationSnapshot = useCallback((snapshot) => {
    setLocationLabel(snapshot.locationLabel || "");
    setCoordinates(snapshot.coordinates || null);
    setSource(snapshot.source || "");
    if (snapshot.locationLabel && snapshot.coordinates) {
      setStatus("ready");
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    if (requestingRef.current) return;

    requestingRef.current = true;
    setStatus("loading");
    let bestPosition = null;
    let completed = false;
    let watchId = null;

    const finishWithPosition = async (position) => {
      if (completed) return;
      completed = true;
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);

      try {
        const nextCoordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: Number.isFinite(position.coords.accuracy)
            ? position.coords.accuracy
            : null,
        };
        const label = await reverseGeocode(
          nextCoordinates.latitude,
          nextCoordinates.longitude
        );
        persistLocation({
          label,
          coordinates: nextCoordinates,
          source: "gps",
        });
        setLocationLabel(label);
        setCoordinates(nextCoordinates);
        setSource("gps");
        setStatus("ready");
      } catch {
        setStatus("error");
      } finally {
        requestingRef.current = false;
      }
    };

    const timeoutId = window.setTimeout(() => {
      if (bestPosition) {
        finishWithPosition(bestPosition);
        return;
      }
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      requestingRef.current = false;
      setStatus("error");
    }, 12000);

    const finish = (position) => {
      window.clearTimeout(timeoutId);
      finishWithPosition(position);
    };

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (
          !bestPosition ||
          Number(position.coords.accuracy || Infinity) <
            Number(bestPosition.coords.accuracy || Infinity)
        ) {
          bestPosition = position;
        }

        if (Number(position.coords.accuracy || Infinity) <= 75) {
          finish(position);
        }
      },
      (error) => {
        if (bestPosition) {
          finish(bestPosition);
          return;
        }
        window.clearTimeout(timeoutId);
        requestingRef.current = false;
        if (error.code === error.PERMISSION_DENIED) {
          setStatus("denied");
          return;
        }
        setStatus("error");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  const setManualLocation = useCallback((nextLocation) => {
    const latitude = Number(nextLocation?.latitude);
    const longitude = Number(nextLocation?.longitude);
    const label = String(nextLocation?.label || nextLocation?.address || "").trim();

    if (!label || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return false;
    }

    const nextCoordinates = { latitude, longitude };
    persistLocation({
      label,
      coordinates: nextCoordinates,
      source: "manual",
    });
    setLocationLabel(label);
    setCoordinates(nextCoordinates);
    setSource("manual");
    setStatus("ready");
    return true;
  }, []);

  useEffect(() => {
    const handleLocationChange = (event) => {
      applyLocationSnapshot(event.detail || getStoredLocationSnapshot());
    };

    const handleStorageChange = (event) => {
      if (
        event.key === STORAGE_KEY ||
        event.key === COORDINATES_STORAGE_KEY ||
        event.key === SOURCE_STORAGE_KEY
      ) {
        applyLocationSnapshot(getStoredLocationSnapshot());
      }
    };

    window.addEventListener(LOCATION_EVENT, handleLocationChange);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener(LOCATION_EVENT, handleLocationChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [applyLocationSnapshot]);

  useEffect(() => {
    if (!enabled) return;

    if (!navigator.geolocation) {
      setStatus("unsupported");
      return;
    }

    let permissionStatus;
    const setup = async () => {
      if (!navigator.permissions?.query) {
        setStatus(locationLabel ? "ready" : "needs_permission");
        return;
      }

      try {
        permissionStatus = await navigator.permissions.query({ name: "geolocation" });
        if (permissionStatus.state === "granted") {
          if (sourceRef.current !== "manual") {
            requestLocation();
          } else {
            setStatus(locationLabelRef.current && coordinatesRef.current ? "ready" : "needs_permission");
          }
        } else if (permissionStatus.state === "denied") {
          setStatus(locationLabelRef.current && coordinatesRef.current ? "ready" : "denied");
        } else {
          setStatus(locationLabelRef.current && coordinatesRef.current ? "ready" : "needs_permission");
        }

        permissionStatus.onchange = () => {
          if (permissionStatus.state === "granted") {
            if (sourceRef.current !== "manual") {
              requestLocation();
            } else {
              setStatus(locationLabelRef.current && coordinatesRef.current ? "ready" : "needs_permission");
            }
            return;
          }
          if (permissionStatus.state === "denied") {
            setStatus(locationLabelRef.current && coordinatesRef.current ? "ready" : "denied");
            return;
          }
          setStatus(locationLabelRef.current && coordinatesRef.current ? "ready" : "needs_permission");
        };
      } catch {
        setStatus(locationLabelRef.current && coordinatesRef.current ? "ready" : "needs_permission");
      }
    };

    setup();
    return () => {
      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, [enabled, requestLocation]);

  return {
    coordinates,
    locationLabel,
    source,
    status,
    requestLocation,
    setManualLocation,
  };
};

export default useCustomerLocation;
