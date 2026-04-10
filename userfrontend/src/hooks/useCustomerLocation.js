import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "zahi_customer_location_label";
const COORDINATES_STORAGE_KEY = "zahi_customer_location_coords";

const parseStoredCoordinates = () => {
  try {
    const payload = JSON.parse(window.localStorage.getItem(COORDINATES_STORAGE_KEY) || "null");
    const latitude = Number(payload?.latitude);
    const longitude = Number(payload?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }
    return { latitude, longitude };
  } catch {
    return null;
  }
};

const coordinatesMatch = (left, right) => {
  if (!left || !right) return false;
  return (
    Math.abs(Number(left.latitude) - Number(right.latitude)) < 0.00001 &&
    Math.abs(Number(left.longitude) - Number(right.longitude)) < 0.00001
  );
};

const cleanAreaName = (value) =>
  String(value || "")
    .replace(
      /\b(municipality|corporation|district|taluk|taluka|block|village|panchayat|tehsil|subdistrict)\b/gi,
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();

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
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: "en",
  });
  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Location lookup failed");
  }

  const payload = await response.json();
  return buildLocationLabel(payload) || "Current location";
};

export const useCustomerLocation = (enabled = true) => {
  const [locationLabel, setLocationLabel] = useState(() => window.localStorage.getItem(STORAGE_KEY) || "");
  const [coordinates, setCoordinates] = useState(() => parseStoredCoordinates());
  const [status, setStatus] = useState(locationLabel ? "ready" : "idle");
  const coordinatesRef = useRef(coordinates);
  const locationLabelRef = useRef(locationLabel);
  const requestingRef = useRef(false);

  useEffect(() => {
    coordinatesRef.current = coordinates;
  }, [coordinates]);

  useEffect(() => {
    locationLabelRef.current = locationLabel;
  }, [locationLabel]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    if (requestingRef.current) return;

    requestingRef.current = true;
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const nextCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          const label = await reverseGeocode(
            nextCoordinates.latitude,
            nextCoordinates.longitude
          );
          window.localStorage.setItem(STORAGE_KEY, label);
          window.localStorage.setItem(
            COORDINATES_STORAGE_KEY,
            JSON.stringify(nextCoordinates)
          );
          if (label !== locationLabelRef.current) {
            setLocationLabel(label);
          }
          if (!coordinatesMatch(coordinatesRef.current, nextCoordinates)) {
            setCoordinates(nextCoordinates);
          }
          setStatus("ready");
        } catch {
          setStatus("error");
        } finally {
          requestingRef.current = false;
        }
      },
      (error) => {
        requestingRef.current = false;
        if (error.code === error.PERMISSION_DENIED) {
          setStatus("denied");
          return;
        }
        setStatus("error");
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, []);

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
          requestLocation();
        } else if (permissionStatus.state === "denied") {
          setStatus(locationLabelRef.current && coordinatesRef.current ? "ready" : "denied");
        } else {
          setStatus(locationLabelRef.current && coordinatesRef.current ? "ready" : "needs_permission");
        }

        permissionStatus.onchange = () => {
          if (permissionStatus.state === "granted") {
            requestLocation();
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
    status,
    requestLocation,
  };
};

export default useCustomerLocation;
