import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CarFront,
  Clock3,
  MapPin,
  Plane,
  Store,
  Users,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import useCustomerLocation from "../hooks/useCustomerLocation";
import { formatAddress, formatCurrency, formatDistance, shortText } from "../lib/format";
import marketplaceService from "../services/marketplaceService";

const serviceTabs = [
  { key: "restaurants", label: "Food", icon: Store },
  { key: "cabs", label: "Cabs", icon: CarFront },
  { key: "flights", label: "Flights", icon: Plane },
];

const SectionHeader = ({ eyebrow, title, body, to, cta }) => (
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      <p className="text-xs uppercase tracking-[0.28em] text-[#c15d1f]">{eyebrow}</p>
      <h2 className="font-display mt-3 text-5xl leading-none text-[#1f1812]">{title}</h2>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-[#68584b]">{body}</p>
    </div>
    {to && cta ? (
      <Link
        to={to}
        className="inline-flex items-center gap-2 self-start rounded-full border border-[rgba(87,62,39,0.12)] bg-white px-5 py-3 text-sm font-medium text-[#1f1812] shadow-sm"
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    ) : null}
  </div>
);

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { coordinates, locationLabel, requestLocation } = useCustomerLocation(true);
  const coordinateKey = coordinates
    ? `${coordinates.latitude.toFixed(5)}:${coordinates.longitude.toFixed(5)}`
    : "no-location";
  const [activeTab, setActiveTab] = useState("restaurants");
  const [foodItems, setFoodItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [foodSearch, setFoodSearch] = useState({
    query: "",
    diners: 2,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await marketplaceService.getFoodItems(
          coordinates
            ? {
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
              }
            : undefined
        );
        if (!active) return;
        setFoodItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load food marketplace overview", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [coordinateKey]);

  const representedRestaurants = useMemo(
    () => new Set(foodItems.map((item) => item.restaurant?.id || item.restaurant_slug)).size,
    [foodItems]
  );

  const heroStats = useMemo(
    () => [
      {
        label: "Live dishes",
        value: foodItems.length,
        caption: "Available menu items across all partner restaurants",
      },
      {
        label: "Partner outlets",
        value: representedRestaurants,
        caption: coordinates
          ? `Ranked around ${locationLabel || "your location"}`
          : "Restaurant names stay visible as supporting context",
      },
      {
        label: "Customer requests",
        value: isAuthenticated ? "Ready" : "Login",
        caption: "Food requests can be saved into one customer account",
      },
    ],
    [coordinates, foodItems.length, isAuthenticated, locationLabel, representedRestaurants]
  );

  const spotlightItems = foodItems.slice(0, 4);

  const handleHeroSubmit = (event) => {
    event.preventDefault();

    if (activeTab === "restaurants") {
      const params = new URLSearchParams({
        query: foodSearch.query,
        diners: String(foodSearch.diners),
      });
      navigate(`/restaurants?${params.toString()}`);
      return;
    }

    navigate(activeTab === "cabs" ? "/cabs" : "/flights");
  };

  return (
    <div className="space-y-16">
      <section className="glass-panel overflow-hidden rounded-[40px] p-6 sm:p-8 lg:p-10">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-[#c15d1f]">Zahi customer food board</p>
            <h1 className="font-display mt-4 max-w-4xl text-6xl leading-none text-[#1f1812] sm:text-7xl">
              Search live dishes from every partner restaurant in one feed.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[#68584b]">
              This customer experience is now dish-first. Search across all currently available menu
              items, keep the restaurant as supporting detail, and move into the outlet only when
              you are ready to order. When location is available, the nearest restaurants rise to
              the top automatically.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {coordinates && locationLabel ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-[#f5e4d2] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8e4a1d]">
                  <MapPin className="h-3.5 w-3.5" />
                  Nearest around {locationLabel}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={requestLocation}
                  className="inline-flex items-center gap-2 rounded-full border border-[rgba(198,99,44,0.22)] bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8e4a1d] transition hover:bg-[#fff8f1]"
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Enable nearby results
                </button>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {serviceTabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium transition ${
                      activeTab === tab.key
                        ? "bg-[#1f1812] text-white"
                        : "bg-white text-[#5c4a3d] shadow-sm"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={handleHeroSubmit}
              className="mt-8 rounded-[32px] bg-white p-4 shadow-[0_22px_60px_rgba(63,44,27,0.08)]"
            >
              {activeTab === "restaurants" ? (
                <div className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr_auto]">
                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#a2856b]">
                      <MapPin className="h-4 w-4" />
                      Dish, cuisine, or restaurant
                    </span>
                    <input
                      type="text"
                      value={foodSearch.query}
                      onChange={(event) =>
                        setFoodSearch((current) => ({
                          ...current,
                          query: event.target.value,
                        }))
                      }
                      placeholder="Search biryani, pasta, juice, or restaurant"
                      className="w-full rounded-[22px] border border-[rgba(87,62,39,0.12)] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#d66a2f]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#a2856b]">
                      <Users className="h-4 w-4" />
                      Diners
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={foodSearch.diners}
                      onChange={(event) =>
                        setFoodSearch((current) => ({
                          ...current,
                          diners: Number(event.target.value) || 1,
                        }))
                      }
                      className="w-full rounded-[22px] border border-[rgba(87,62,39,0.12)] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#d66a2f]"
                    />
                  </label>
                  <button
                    type="submit"
                    className="mt-auto inline-flex items-center justify-center rounded-[22px] bg-[#1f1812] px-5 py-3.5 text-sm font-semibold text-white"
                  >
                    Search food
                  </button>
                </div>
              ) : null}

              {activeTab === "cabs" ? (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1f1812]">Cab request lane is staged next.</p>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-[#68584b]">
                      Capture airport transfer and local ride demand while the dispatch layer is
                      still being built.
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-[22px] bg-[#1f1812] px-5 py-3.5 text-sm font-semibold text-white"
                  >
                    Open cab lane
                  </button>
                </div>
              ) : null}

              {activeTab === "flights" ? (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1f1812]">Flight request lane is staged next.</p>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-[#68584b]">
                      Keep the travel lane visible now, then turn it into a full booking flow once
                      the backend is ready.
                    </p>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-[22px] bg-[#1f1812] px-5 py-3.5 text-sm font-semibold text-white"
                  >
                    Open flight lane
                  </button>
                </div>
              ) : null}
            </form>
          </div>

          <div className="space-y-4">
            <div className="soft-card rounded-[32px] p-5">
              <p className="text-xs uppercase tracking-[0.26em] text-[#c15d1f]">Today on Zahi</p>
              <div className="mt-5 grid gap-3">
                {heroStats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-[24px] border border-[rgba(87,62,39,0.08)] bg-[#fffdf9] p-4"
                  >
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">{stat.label}</p>
                        <p className="font-display mt-2 text-5xl leading-none text-[#1f1812]">
                          {stat.value}
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-[#d66a2f]" />
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[#68584b]">{stat.caption}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="soft-card rounded-[32px] p-5">
              <p className="text-xs uppercase tracking-[0.26em] text-[#c15d1f]">What changes now</p>
              <div className="mt-5 space-y-3">
                {[
                  "Search now works across dishes, cuisine labels, and restaurant names.",
                  "Restaurant identity stays visible, but the dish remains the main result.",
                  "Food requests can still be saved into the same customer account.",
                ].map((item) => (
                  <div
                    key={item}
                    className="rounded-[24px] bg-[#fbf2e7] px-4 py-4 text-sm leading-7 text-[#4f4135]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {[
          {
            title: "Dish-first browsing",
            body: "Customers now land on actual menu items instead of needing to pick a restaurant first.",
            tone: "bg-[#fff7ef]",
          },
          {
            title: "Shared menu feed",
            body: "Available dishes from all partner restaurants are combined into one searchable catalog.",
            tone: "bg-[#fffaf4]",
          },
          {
            title: "Actionable requests",
            body: "When a customer is ready, they can jump into the outlet and save a structured food request.",
            tone: "bg-[#fdf5ed]",
          },
        ].map((item) => (
          <div key={item.title} className={`soft-card rounded-[30px] p-6 ${item.tone}`}>
            <p className="text-xs uppercase tracking-[0.24em] text-[#c15d1f]">Platform shift</p>
            <h3 className="font-display mt-3 text-4xl leading-none text-[#1f1812]">{item.title}</h3>
            <p className="mt-4 text-sm leading-7 text-[#68584b]">{item.body}</p>
          </div>
        ))}
      </section>

      <section className="space-y-6">
        <SectionHeader
          eyebrow="Available now"
          title="Popular dishes across the network"
          body="These highlights come from the combined live menu feed, so each card is a real dish that can be explored immediately."
          to="/restaurants"
          cta="Browse all food"
        />

        {loading ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="soft-card h-80 animate-pulse rounded-[32px]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            {spotlightItems.map((item) => (
              <Link
                key={`${item.restaurant_slug}-${item.id}`}
                to={`/restaurants/${item.restaurant_slug}?focus=${item.id}&diners=${foodSearch.diners}`}
                className="soft-card group overflow-hidden rounded-[32px] transition hover:-translate-y-1"
              >
                <div className="grid gap-0 md:grid-cols-[200px_1fr]">
                  <div className="overflow-hidden bg-[#f1e3d4]">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full min-h-56 w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex min-h-56 items-center justify-center text-[#b88c6e]">
                        <Store className="h-10 w-10" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 p-5">
                    <div className="flex flex-wrap gap-2">
                      {item.category_name ? (
                        <span className="rounded-full bg-[#f4e6d8] px-3 py-1 text-xs font-medium text-[#5d4d40]">
                          {item.category_name}
                        </span>
                      ) : null}
                      <span className="rounded-full bg-[#fbefe4] px-3 py-1 text-xs font-medium text-[#a54d16]">
                        {item.restaurant_name}
                      </span>
                      {item.distance_km !== null && item.distance_km !== undefined ? (
                        <span className="rounded-full bg-[#f5e4d2] px-3 py-1 text-xs font-medium text-[#8e4a1d]">
                          {formatDistance(item.distance_km)}
                        </span>
                      ) : null}
                    </div>

                    <div>
                      <h3 className="font-display text-5xl leading-none text-[#1f1812]">{item.name}</h3>
                      <p className="mt-3 text-sm leading-7 text-[#68584b]">
                        {shortText(item.description, 120) || "Currently available to order from this outlet."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-[#6a5f56]">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-4 w-4" />
                        {item.prep_time_minutes} mins
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {formatAddress(item.restaurant_address)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <p className="font-semibold text-[#1f1812]">{formatCurrency(item.display_price)}</p>
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-[#8e3f11]">
                        Open menu
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="soft-card rounded-[34px] p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-[#c15d1f]">Cab lane</p>
          <h2 className="font-display mt-3 text-5xl leading-none text-[#1f1812]">Airport transfers and local rides</h2>
          <p className="mt-4 text-sm leading-7 text-[#68584b]">
            The dispatch engine is still under development, but the customer-facing lane is ready
            so you can capture demand now.
          </p>
          <Link
            to="/cabs"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1f1812] px-5 py-3 text-sm font-semibold text-white"
          >
            Open cabs
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="soft-card rounded-[34px] p-6 sm:p-8">
          <p className="text-xs uppercase tracking-[0.28em] text-[#c15d1f]">Flight lane</p>
          <h2 className="font-display mt-3 text-5xl leading-none text-[#1f1812]">Travel requests staged for the next backend</h2>
          <p className="mt-4 text-sm leading-7 text-[#68584b]">
            Keep the travel lane visible today, then expand it into a full booking flow once that
            backend is ready.
          </p>
          <Link
            to="/flights"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#1f1812] px-5 py-3 text-sm font-semibold text-white"
          >
            Open flights
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
