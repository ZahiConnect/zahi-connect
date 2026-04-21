import { useEffect, useMemo, useRef, useState } from "react";

import marketplaceService from "../services/marketplaceService";

const CACHE_PREFIX = "zahi_marketplace_food_items";

const buildCacheKey = (coordinates) => {
  if (!coordinates) return "no-location";

  const latitude = Number(coordinates.latitude);
  const longitude = Number(coordinates.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return "no-location";
  }

  return `${latitude.toFixed(5)}:${longitude.toFixed(5)}`;
};

const readCachedFoodItems = (cacheKey) => {
  if (typeof window === "undefined") return [];

  try {
    const rawValue = window.sessionStorage.getItem(`${CACHE_PREFIX}:${cacheKey}`);
    if (!rawValue) return [];

    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
};

const writeCachedFoodItems = (cacheKey, items) => {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(`${CACHE_PREFIX}:${cacheKey}`, JSON.stringify(items));
  } catch {
    // Ignore storage failures and keep the live result.
  }
};

const useMarketplaceFoodItems = (coordinates) => {
  const cacheKey = useMemo(
    () => buildCacheKey(coordinates),
    [coordinates?.latitude, coordinates?.longitude]
  );
  const cachedFoodItems = useMemo(() => readCachedFoodItems(cacheKey), [cacheKey]);
  const [foodItems, setFoodItems] = useState(cachedFoodItems);
  const [loading, setLoading] = useState(cachedFoodItems.length === 0);
  const visibleItemCountRef = useRef(cachedFoodItems.length);
  const requestIdRef = useRef(0);

  useEffect(() => {
    visibleItemCountRef.current = foodItems.length;
  }, [foodItems.length]);

  useEffect(() => {
    if (cachedFoodItems.length > 0) {
      setFoodItems(cachedFoodItems);
      setLoading(false);
    } else if (visibleItemCountRef.current === 0) {
      setLoading(true);
    }

    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    const loadFoodItems = async () => {
      try {
        const params = coordinates
          ? { latitude: coordinates.latitude, longitude: coordinates.longitude }
          : undefined;
        const data = await marketplaceService.getFoodItems(params, { signal: controller.signal });

        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        const nextFoodItems = Array.isArray(data) ? data : [];
        setFoodItems(nextFoodItems);
        setLoading(false);
        writeCachedFoodItems(cacheKey, nextFoodItems);
      } catch (error) {
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
          return;
        }

        console.error("Failed to load food catalog", error);
        if (visibleItemCountRef.current === 0) {
          setLoading(false);
        }
      }
    };

    loadFoodItems();

    return () => {
      controller.abort();
    };
  }, [cacheKey, cachedFoodItems, coordinates?.latitude, coordinates?.longitude]);

  return {
    foodItems,
    loading,
  };
};

export default useMarketplaceFoodItems;
