import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, ChefHat, Clock3, MapPin, Search, Store, Users } from "lucide-react";

import useCustomerLocation from "../hooks/useCustomerLocation";
import marketplaceService from "../services/marketplaceService";
import {
  formatAddress,
  formatCurrency,
  formatDistance,
  shortText,
} from "../lib/format";

const RestaurantsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState("all");
  const { coordinates, locationLabel, requestLocation } = useCustomerLocation(true);
  const coordinateKey = coordinates
    ? `${coordinates.latitude.toFixed(5)}:${coordinates.longitude.toFixed(5)}`
    : "no-location";

  const query = searchParams.get("query") || "";
  const diners = Number(searchParams.get("diners") || "2");

  useEffect(() => {
    let active = true;

    const loadNearest = async () => {
      try {
        setLoading(true);
        const data = await marketplaceService.getFoodItems(
          coordinates
            ? {
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
              }
            : undefined
        );
        if (active) {
          setFoodItems(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load food catalog", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadNearest();
    return () => {
      active = false;
    };
  }, [coordinateKey]);

  const allTags = useMemo(() => {
    const tags = new Set();
    foodItems.forEach((item) => {
      if (item.category_name) tags.add(item.category_name);
    });
    return ["all", ...Array.from(tags)];
  }, [foodItems]);

  const filteredItems = useMemo(() => {
    return foodItems.filter((item) => {
      const haystack = [
        item.name,
        item.description,
        item.category_name,
        item.restaurant_name,
        item.restaurant_address,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = haystack.includes(query.toLowerCase());
      const matchesTag = activeTag === "all" || item.category_name === activeTag;
      return matchesSearch && matchesTag;
    });
  }, [activeTag, foodItems, query]);

  const rankedItems = useMemo(() => filteredItems, [filteredItems]);

  const representedRestaurants = useMemo(
    () => new Set(rankedItems.map((item) => item.restaurant?.id || item.restaurant_slug)).size,
    [rankedItems]
  );

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value || value === 0) next.set(key, String(value));
    else next.delete(key);
    setSearchParams(next);
  };

  return (
    <div className="space-y-10">
      <section className="glass-panel rounded-[36px] px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#c15d1f]">Food lane</p>
            <h1 className="font-display mt-3 text-6xl leading-none text-[#1f1812]">
              Browse live dishes across every restaurant
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#68584b]">
              This page works as one shared menu feed. Search by dish, cuisine, or restaurant, and
              keep the restaurant name as supporting context instead of the main result. When your
              location is enabled, dishes are ranked from the nearest restaurant first.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {coordinates && locationLabel ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#f5e4d2] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8e4a1d]">
                  <MapPin className="h-3.5 w-3.5" />
                  Sorted near {locationLabel}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={requestLocation}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(198,99,44,0.22)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8e4a1d] transition hover:bg-[#fff8f1]"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Enable nearby sorting
                </button>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="soft-card rounded-[24px] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Dishes</p>
              <p className="mt-2 text-sm font-semibold text-[#1f1812]">{filteredItems.length} results</p>
            </div>
            <div className="soft-card rounded-[24px] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Restaurants</p>
              <p className="mt-2 text-sm font-semibold text-[#1f1812]">{representedRestaurants} outlets</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_220px]">
          <label className="soft-card flex items-center gap-3 rounded-full px-4 py-3">
            <Search className="h-4 w-4 text-[#8c7a6c]" />
            <input
              type="text"
              value={query}
              onChange={(event) => updateParam("query", event.target.value)}
              placeholder="Search dishes, cuisines, or restaurants"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#a89788]"
            />
          </label>
          <label className="soft-card inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm text-[#5d4d40]">
            <Users className="h-4 w-4" />
            <input
              type="number"
              min="1"
              max="20"
              value={diners}
              onChange={(event) => updateParam("diners", Number(event.target.value) || 1)}
              className="w-16 bg-transparent outline-none"
            />
            diners
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                activeTag === tag
                  ? "bg-[#1f1812] text-white"
                  : "bg-white text-[#5d4d40] shadow-sm"
              }`}
            >
              {tag === "all" ? "All dishes" : tag}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="soft-card h-56 animate-pulse rounded-[32px]" />
          ))}
        </div>
      ) : rankedItems.length === 0 ? (
        <div className="soft-card rounded-[34px] px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f3e6d5] text-[#8e3f11]">
            <ChefHat className="h-6 w-6" />
          </div>
          <h2 className="font-display mt-5 text-5xl text-[#1f1812]">No dishes match that search.</h2>
          <p className="mt-3 text-sm leading-7 text-[#68584b]">
            Try a dish name, cuisine, or restaurant keyword to bring live menu results back.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rankedItems.map((item) => (
            <article key={`${item.restaurant_slug}-${item.id}`} className="soft-card rounded-[32px] p-4 sm:p-5">
              <div className="grid gap-5 lg:grid-cols-[170px_minmax(0,1fr)_250px]">
                <div className="overflow-hidden rounded-[26px] bg-[#f1e3d4]">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-full min-h-40 w-full object-cover" />
                  ) : (
                    <div className="flex min-h-40 items-center justify-center text-[#b88c6e]">
                      <ChefHat className="h-9 w-9" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.category_name ? (
                      <span className="rounded-full bg-[#f4e6d8] px-3 py-1 text-xs font-medium text-[#5d4d40]">
                        {item.category_name}
                      </span>
                    ) : null}
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        item.food_type === "veg"
                          ? "bg-[#eaf5f1] text-[#2e7d67]"
                          : "bg-[#fbefe4] text-[#a54d16]"
                      }`}
                    >
                      {item.food_type === "veg" ? "Veg" : "Non-veg"}
                    </span>
                  </div>

                  <div>
                    <h2 className="font-display text-5xl leading-none text-[#1f1812]">{item.name}</h2>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-[#68584b]">
                      {shortText(item.description, 180) || "Freshly prepared and currently available to order."}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-sm text-[#6a5f56]">
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-4 w-4" />
                      {item.prep_time_minutes} mins
                    </span>
                    {item.distance_km !== null && item.distance_km !== undefined ? (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {formatDistance(item.distance_km)}
                      </span>
                    ) : null}
                    <Link
                      to={`/restaurants/${item.restaurant_slug}?diners=${diners}&focus=${item.id}`}
                      className="inline-flex items-center gap-1 rounded-full bg-[#fff4e9] px-3 py-1 text-sm font-medium text-[#8e3f11] transition hover:bg-[#f7e4d1]"
                    >
                      <Store className="h-4 w-4" />
                      {item.restaurant_name}
                    </Link>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {formatAddress(item.restaurant_address)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-4 rounded-[28px] bg-[#fff9f2] p-4">
                  <Link
                    to={`/restaurants/${item.restaurant_slug}?diners=${diners}&focus=${item.id}`}
                    className="block rounded-[22px] border border-[rgba(214,106,47,0.16)] bg-white px-4 py-4 transition hover:border-[rgba(214,106,47,0.3)] hover:bg-[#fff6ee]"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Price</p>
                    <p className="mt-2 font-display text-5xl leading-none text-[#1f1812]">
                      {formatCurrency(item.display_price)}
                    </p>
                    <p className="mt-4 text-xs uppercase tracking-[0.18em] text-[#a2856b]">
                      Shop
                    </p>
                    <p className="mt-2 text-base font-semibold text-[#1f1812]">{item.restaurant_name}</p>
                    <p className="mt-2 text-sm leading-6 text-[#68584b]">
                      {formatAddress(item.restaurant_address)}
                    </p>
                    {item.distance_km !== null && item.distance_km !== undefined ? (
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#a54d16]">
                        {formatDistance(item.distance_km)}
                      </p>
                    ) : null}
                    <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#8e3f11]">
                      Open shop details
                      <ArrowRight className="h-4 w-4" />
                    </p>
                  </Link>

                  <Link
                    to={`/restaurants/${item.restaurant_slug}?diners=${diners}&focus=${item.id}`}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1f1812] px-4 py-3 text-sm font-semibold text-white"
                  >
                    View menu
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantsPage;
