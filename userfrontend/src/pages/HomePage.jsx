import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CarFront,
  CalendarDays,
  Hotel,
  MapPin,
  Plane,
  Store,
  Users,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import marketplaceService from "../services/marketplaceService";
import {
  formatAddress,
  formatCurrency,
  shortText,
  todayDate,
} from "../lib/format";

const serviceTabs = [
  { key: "hotels", label: "Hotels", icon: Hotel },
  { key: "restaurants", label: "Restaurants", icon: Store },
  { key: "cabs", label: "Cabs", icon: CarFront },
  { key: "flights", label: "Flights", icon: Plane },
];

const tomorrowDate = () => {
  const next = new Date();
  next.setDate(next.getDate() + 1);
  return next.toISOString().slice(0, 10);
};

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
  const [activeTab, setActiveTab] = useState("hotels");
  const [restaurants, setRestaurants] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hotelSearch, setHotelSearch] = useState({
    query: "",
    checkIn: todayDate(),
    checkOut: tomorrowDate(),
    guests: 2,
  });
  const [restaurantSearch, setRestaurantSearch] = useState({
    query: "",
    diners: 2,
  });

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [restaurantData, hotelData] = await Promise.all([
          marketplaceService.getRestaurants(),
          marketplaceService.getHotels(),
        ]);

        if (!active) return;
        setRestaurants(Array.isArray(restaurantData) ? restaurantData : []);
        setHotels(Array.isArray(hotelData) ? hotelData : []);
      } catch (error) {
        console.error("Failed to load marketplace overview", error);
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
  }, []);

  const heroStats = useMemo(
    () => [
      {
        label: "Live hotels",
        value: hotels.length,
        caption: "Room types and rates pulled from tenant dashboards",
      },
      {
        label: "Live restaurants",
        value: restaurants.length,
        caption: "Menus and hero dishes surfaced directly from the DB",
      },
      {
        label: "Customer requests",
        value: isAuthenticated ? "Ready" : "Login",
        caption: "Book, enquire, and save travel requests from one account",
      },
    ],
    [hotels.length, isAuthenticated, restaurants.length]
  );

  const hotelSpotlight = hotels.slice(0, 3);
  const restaurantSpotlight = restaurants.slice(0, 3);

  const handleHeroSubmit = (event) => {
    event.preventDefault();

    if (activeTab === "hotels") {
      const params = new URLSearchParams({
        query: hotelSearch.query,
        checkIn: hotelSearch.checkIn,
        checkOut: hotelSearch.checkOut,
        guests: String(hotelSearch.guests),
      });
      navigate(`/hotels?${params.toString()}`);
      return;
    }

    if (activeTab === "restaurants") {
      const params = new URLSearchParams({
        query: restaurantSearch.query,
        diners: String(restaurantSearch.diners),
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
            <p className="text-xs uppercase tracking-[0.32em] text-[#c15d1f]">Zahi customer travel board</p>
            <h1 className="font-display mt-4 max-w-4xl text-6xl leading-none text-[#1f1812] sm:text-7xl">
              Goibibo-style discovery, rebuilt for your Zahi ecosystem.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-[#68584b]">
              Hotels and restaurants already read from your live business data. Cabs and flights now
              have proper customer-facing lanes so the product feels complete without pretending those
              operations are fully shipped yet.
            </p>

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

            <form onSubmit={handleHeroSubmit} className="mt-8 rounded-[32px] bg-white p-4 shadow-[0_22px_60px_rgba(63,44,27,0.08)]">
              {activeTab === "hotels" ? (
                <div className="grid gap-4 lg:grid-cols-[1.4fr_0.85fr_0.85fr_0.7fr_auto]">
                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#a2856b]">
                      <MapPin className="h-4 w-4" />
                      Destination
                    </span>
                    <input
                      type="text"
                      value={hotelSearch.query}
                      onChange={(event) =>
                        setHotelSearch((current) => ({ ...current, query: event.target.value }))
                      }
                      placeholder="Search hotel, area, or room type"
                      className="w-full rounded-[22px] border border-[rgba(87,62,39,0.12)] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#d66a2f]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#a2856b]">
                      <CalendarDays className="h-4 w-4" />
                      Check-in
                    </span>
                    <input
                      type="date"
                      value={hotelSearch.checkIn}
                      onChange={(event) =>
                        setHotelSearch((current) => ({ ...current, checkIn: event.target.value }))
                      }
                      className="w-full rounded-[22px] border border-[rgba(87,62,39,0.12)] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#d66a2f]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#a2856b]">
                      <CalendarDays className="h-4 w-4" />
                      Check-out
                    </span>
                    <input
                      type="date"
                      value={hotelSearch.checkOut}
                      onChange={(event) =>
                        setHotelSearch((current) => ({ ...current, checkOut: event.target.value }))
                      }
                      className="w-full rounded-[22px] border border-[rgba(87,62,39,0.12)] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#d66a2f]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#a2856b]">
                      <Users className="h-4 w-4" />
                      Guests
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="8"
                      value={hotelSearch.guests}
                      onChange={(event) =>
                        setHotelSearch((current) => ({
                          ...current,
                          guests: Number(event.target.value) || 1,
                        }))
                      }
                      className="w-full rounded-[22px] border border-[rgba(87,62,39,0.12)] bg-[#fffdf9] px-4 py-3 outline-none focus:border-[#d66a2f]"
                    />
                  </label>
                  <button
                    type="submit"
                    className="mt-auto inline-flex items-center justify-center rounded-[22px] bg-[#1f1812] px-5 py-3.5 text-sm font-semibold text-white"
                  >
                    Search hotels
                  </button>
                </div>
              ) : null}

              {activeTab === "restaurants" ? (
                <div className="grid gap-4 lg:grid-cols-[1.5fr_0.8fr_auto]">
                  <label className="block">
                    <span className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#a2856b]">
                      <MapPin className="h-4 w-4" />
                      Area or cuisine
                    </span>
                    <input
                      type="text"
                      value={restaurantSearch.query}
                      onChange={(event) =>
                        setRestaurantSearch((current) => ({ ...current, query: event.target.value }))
                      }
                      placeholder="Search restaurant, area, or menu category"
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
                      value={restaurantSearch.diners}
                      onChange={(event) =>
                        setRestaurantSearch((current) => ({
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
                    Explore restaurants
                  </button>
                </div>
              ) : null}

              {activeTab === "cabs" ? (
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#1f1812]">Cab booking lane is staged next.</p>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-[#68584b]">
                      Open the cab lane to capture pickup requests, airport transfers, and demand
                      signals while the full dispatch system is still being built.
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
                    <p className="text-sm font-semibold text-[#1f1812]">Flight discovery is staged next.</p>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-[#68584b]">
                      Keep the flight lane visible now, then turn it into a real search and booking
                      flow once your travel backend is ready.
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
                  "Customer accounts now stay isolated from workspace logins.",
                  "Hotel and restaurant CTAs can save real booking requests.",
                  "Cabs and flights have consumer lanes ready for the next backend sprint.",
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
            title: "Hotels from live room data",
            body: "Room types, prices, and inventory come from the existing hotel collections in your database.",
            tone: "bg-[#fff7ef]",
          },
          {
            title: "Restaurants from live menus",
            body: "Menu cards and item pricing are pulled from restaurant tenants without creating a duplicate content layer.",
            tone: "bg-[#fffaf4]",
          },
          {
            title: "Requests saved to backend",
            body: "Customer booking and enquiry actions now persist into a dedicated booking microservice for account history.",
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
          eyebrow="Popular stays"
          title="Hotels ready for customer discovery"
          body="These cards are built from the same hotel tenant data your workspace frontend already manages, but presented as a travel shopping surface."
          to="/hotels"
          cta="See all hotels"
        />

        {loading ? (
          <div className="grid gap-5 lg:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="soft-card h-80 animate-pulse rounded-[32px]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {hotelSpotlight.map((hotel) => (
              <Link
                key={hotel.id}
                to={`/hotels/${hotel.slug}`}
                className="soft-card group overflow-hidden rounded-[32px] transition hover:-translate-y-1"
              >
                <div className="relative h-56 overflow-hidden bg-[linear-gradient(135deg,#efddca_0%,#f6eadf_50%,#f0e4d7_100%)]">
                  {hotel.logo ? (
                    <img
                      src={hotel.logo}
                      alt={hotel.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#a48369]">
                      <Hotel className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#32695b]">
                    {hotel.available_rooms || 0} rooms open
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-4xl leading-none text-[#1f1812]">{hotel.name}</h3>
                      <p className="mt-3 text-sm text-[#68584b]">{formatAddress(hotel.address)}</p>
                    </div>
                    <div className="rounded-2xl bg-[#eef7f2] px-3 py-2 text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#32695b]">From</p>
                      <p className="mt-1 font-semibold text-[#1f1812]">
                        {hotel.starting_price ? formatCurrency(hotel.starting_price) : "NA"}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(hotel.room_type_labels || []).slice(0, 3).map((label) => (
                      <span
                        key={label}
                        className="rounded-full bg-[#f4e6d8] px-3 py-1 text-xs font-medium text-[#5d4d40]"
                      >
                        {label}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <SectionHeader
          eyebrow="Trending eats"
          title="Restaurant menus from tenant dashboards"
          body="The restaurant lane behaves like a consumer ordering surface while still staying backed by the existing owner-managed menu data."
          to="/restaurants"
          cta="See all restaurants"
        />

        {loading ? (
          <div className="grid gap-5 lg:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="soft-card h-80 animate-pulse rounded-[32px]" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {restaurantSpotlight.map((restaurant) => (
              <Link
                key={restaurant.id}
                to={`/restaurants/${restaurant.slug}`}
                className="soft-card group overflow-hidden rounded-[32px] transition hover:-translate-y-1"
              >
                <div className="relative h-56 overflow-hidden bg-[#f1e3d4]">
                  {restaurant.cover_image ? (
                    <img
                      src={restaurant.cover_image}
                      alt={restaurant.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#b88c6e]">
                      <Store className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#a54d16]">
                    {restaurant.available_item_count || 0} items live
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-4xl leading-none text-[#1f1812]">
                        {restaurant.name}
                      </h3>
                      <p className="mt-3 text-sm text-[#68584b]">{formatAddress(restaurant.address)}</p>
                    </div>
                    <div className="rounded-2xl bg-[#fbefe4] px-3 py-2 text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#a54d16]">Starts</p>
                      <p className="mt-1 font-semibold text-[#1f1812]">
                        {restaurant.starting_price ? formatCurrency(restaurant.starting_price) : "NA"}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-7 text-[#68584b]">
                    {(restaurant.featured_items || [])
                      .slice(0, 2)
                      .map((item) => item.name)
                      .join(" • ") || "Menus will show here once the tenant publishes dishes."}
                  </p>
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
            We have not built the live dispatch engine yet, but the user-facing lane is ready now
            so you can capture customer intent and turn it into the next operational sprint.
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
          <h2 className="font-display mt-3 text-5xl leading-none text-[#1f1812]">Travel search staged for the next backend</h2>
          <p className="mt-4 text-sm leading-7 text-[#68584b]">
            This keeps the travel story complete for customers today while still being honest that
            the heavy search and ticketing layer is part of a later delivery.
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

      <section className="glass-panel rounded-[36px] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#c15d1f]">Why this structure works</p>
            <h2 className="font-display mt-3 text-5xl leading-none text-[#1f1812]">
              One portal for guests, one portal for operators.
            </h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#68584b]">
              The customer site now behaves like a booking and discovery experience, while the main
              frontend stays focused on workspace operations. Both still use the same accounts
              backend, but they no longer fight over the same refresh cookie or role expectations.
            </p>
          </div>
          <Link
            to="/account"
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(87,62,39,0.12)] bg-white px-5 py-3 text-sm font-semibold text-[#1f1812]"
          >
            View my account
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
