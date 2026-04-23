import { useEffect, useMemo, useRef, useState } from "react";

import marketplaceService from "../services/marketplaceService";

const CACHE_PREFIX = "zahi_marketplace_hotels_v2";
const CACHE_TTL_MS = 5 * 60 * 1000;

const buildCacheKey = (coordinates) => {
  if (!coordinates) return "no-location";

  const latitude = Number(coordinates.latitude);
  const longitude = Number(coordinates.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "no-location";
  }

  return `${latitude.toFixed(5)}:${longitude.toFixed(5)}`;
};

const readCachedHotels = (cacheKey) => {
  if (typeof window === "undefined") return [];

  try {
    const rawValue = window.sessionStorage.getItem(`${CACHE_PREFIX}:${cacheKey}`);
    if (!rawValue) return [];

    const parsedValue = JSON.parse(rawValue);
    if (Array.isArray(parsedValue)) {
      return parsedValue;
    }

    const storedAt = Number(parsedValue?.storedAt);
    const hotels = parsedValue?.hotels;
    if (!Array.isArray(hotels)) {
      return [];
    }
    if (!Number.isFinite(storedAt) || Date.now() - storedAt > CACHE_TTL_MS) {
      return [];
    }

    return hotels;
  } catch {
    return [];
  }
};

const writeCachedHotels = (cacheKey, hotels) => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      `${CACHE_PREFIX}:${cacheKey}`,
      JSON.stringify({
        storedAt: Date.now(),
        hotels,
      })
    );
  } catch {
    // Ignore storage failures and keep the live result.
  }
};

const useMarketplaceHotels = (coordinates) => {
  const cacheKey = useMemo(
    () => buildCacheKey(coordinates),
    [coordinates?.latitude, coordinates?.longitude]
  );
  const cachedHotels = useMemo(() => readCachedHotels(cacheKey), [cacheKey]);
  const [hotels, setHotels] = useState(cachedHotels);
  const [loading, setLoading] = useState(cachedHotels.length === 0);
  const visibleItemCountRef = useRef(cachedHotels.length);
  const requestIdRef = useRef(0);

  useEffect(() => {
    visibleItemCountRef.current = hotels.length;
  }, [hotels.length]);

  useEffect(() => {
    if (cachedHotels.length > 0) {
      setHotels(cachedHotels);
      setLoading(false);
    } else if (visibleItemCountRef.current === 0) {
      setLoading(true);
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    const loadHotels = async () => {
      try {
        const params = coordinates
          ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
          : undefined;
        const data = await marketplaceService.getHotels(params, { signal: controller.signal });

        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        const nextHotels = Array.isArray(data) ? data : [];
        setHotels(nextHotels);
        setLoading(false);
        writeCachedHotels(cacheKey, nextHotels);
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        console.error("Failed to load hotels", error);
        if (visibleItemCountRef.current === 0) {
          setLoading(false);
        }
      }
    };

    loadHotels();

    return () => {
      controller.abort();
    };
  }, [cacheKey, cachedHotels, coordinates?.latitude, coordinates?.longitude]);

  return {
    hotels,
    loading,
  };
};

export default useMarketplaceHotels;
