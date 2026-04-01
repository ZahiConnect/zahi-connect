import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bot,
  CarFront,
  Hotel,
  Store,
  Ticket,
} from "lucide-react";

import marketplaceService from "../services/marketplaceService";
import { buildWhatsAppLink, formatAddress, formatCurrency, shortText } from "../lib/format";

const promptReplies = {
  "Find dinner near me":
    "I can guide you to live restaurant menus right here, and the WhatsApp bot can later handle the final handoff.",
  "Book a room tonight":
    "The hotel marketplace below shows live room types and pricing from the existing owner dashboards.",
  "Need an airport cab":
    "Cab dispatch is staged for the next sprint, so this demo keeps the card visible but clearly marked as coming soon.",
};

const SectionHeader = ({ eyebrow, title, body, cta, to }) => (
  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
    <div>
      <p className="text-xs uppercase tracking-[0.26em] text-[#a6633b]">{eyebrow}</p>
      <h2 className="font-display mt-3 text-5xl leading-none text-[#1f1812]">{title}</h2>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6a5f56]">{body}</p>
    </div>
    {cta && to ? (
      <Link
        to={to}
        className="inline-flex items-center gap-2 self-start rounded-full border border-[rgba(96,73,53,0.14)] bg-white px-5 py-3 text-sm font-medium text-[#1f1812] shadow-sm"
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    ) : null}
  </div>
);

const HomePage = () => {
  const [restaurants, setRestaurants] = useState([]);
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePrompt, setActivePrompt] = useState("Find dinner near me");

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

  const stats = useMemo(
    () => [
      { label: "Restaurants", value: restaurants.length || "0" },
      { label: "Hotels", value: hotels.length || "0" },
      { label: "Live menu items", value: restaurants.reduce((sum, item) => sum + (item.item_count || 0), 0) || "0" },
    ],
    [hotels.length, restaurants]
  );

  return (
    <div className="space-y-16">
      <section className="glass-panel overflow-hidden rounded-[36px] fade-up">
        <div className="grid gap-10 px-6 py-8 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-10">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#a6633b]">User Frontend Demo</p>
            <h1 className="font-display mt-4 max-w-4xl text-6xl leading-none text-[#1f1812] sm:text-7xl">
              One guest-facing website for food and stays.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[#6a5f56]">
              This separate frontend turns your existing hotel and restaurant dashboards into a
              customer marketplace. Menus and room data come from the live database. Cabs and
              flights stay visible as the next phase, not fake-complete.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/restaurants"
                className="rounded-full bg-[#1f1812] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(31,24,18,0.12)]"
              >
                Browse restaurants
              </Link>
              <Link
                to="/hotels"
                className="rounded-full border border-[rgba(96,73,53,0.14)] bg-white px-5 py-3 text-sm font-semibold text-[#1f1812]"
              >
                Browse hotels
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="soft-card rounded-[28px] px-5 py-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-[#a6633b]">{stat.label}</p>
                  <p className="font-display mt-3 text-5xl text-[#1f1812]">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <div className="soft-card rounded-[30px] p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f1812] text-white">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-[#a6633b]">Zahi AI preview</p>
                  <p className="font-display text-3xl text-[#1f1812]">Chat-led service handoff</p>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] bg-[#f9f1e7] p-4">
                <p className="text-sm font-medium text-[#1f1812]">You</p>
                <p className="mt-2 text-sm text-[#5f5145]">{activePrompt}</p>
              </div>

              <div className="mt-4 rounded-[24px] bg-white p-4">
                <p className="text-sm font-medium text-[#1f1812]">Zahi</p>
                <p className="mt-2 text-sm leading-7 text-[#5f5145]">{promptReplies[activePrompt]}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {Object.keys(promptReplies).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setActivePrompt(prompt)}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      activePrompt === prompt
                        ? "bg-[#1f1812] text-white"
                        : "bg-[#f3e6d5] text-[#5b4d40]"
                    }`}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: Store,
                  label: "Restaurants",
                  body: "Swiggy-style browse, local cart, and WhatsApp handoff using live menu data.",
                  tone: "bg-[rgba(213,109,46,0.12)] text-[#8e3f11]",
                },
                {
                  icon: Hotel,
                  label: "Hotels",
                  body: "Room types, default rates, room inventory, and direct inquiry flow.",
                  tone: "bg-[rgba(46,125,103,0.12)] text-[#245f52]",
                },
                {
                  icon: CarFront,
                  label: "Cabs",
                  body: "Placeholder card only. Dispatch will connect in the next sprint.",
                  tone: "bg-[rgba(58,89,145,0.12)] text-[#324f7e]",
                },
                {
                  icon: Ticket,
                  label: "Flights",
                  body: "Visible for roadmap clarity, but intentionally kept as coming soon.",
                  tone: "bg-[rgba(122,96,62,0.12)] text-[#765735]",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.label} className="soft-card rounded-[28px] p-5">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.tone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 font-semibold text-[#1f1812]">{item.label}</p>
                    <p className="mt-2 text-sm leading-7 text-[#6a5f56]">{item.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionHeader
          eyebrow="Restaurant discovery"
          title="Menu boards pulled from live tenants"
          body="Each card below is powered by the new marketplace endpoints, so this demo frontend stays synced with whatever restaurant data exists in the database."
          cta="Open all restaurants"
          to="/restaurants"
        />

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="soft-card h-72 animate-pulse rounded-[30px]" />
            ))}
          </div>
        ) : restaurants.length === 0 ? (
          <div className="soft-card rounded-[30px] px-6 py-10 text-center text-[#6a5f56]">
            Restaurant owners have not added menu data yet. Once they do, this marketplace updates automatically.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {restaurants.slice(0, 3).map((restaurant) => (
              <Link
                key={restaurant.id}
                to={`/restaurants/${restaurant.slug}`}
                className="soft-card group overflow-hidden rounded-[30px] transition hover:-translate-y-1"
              >
                <div className="relative h-52 overflow-hidden bg-[#f0e2d2]">
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
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#8e3f11]">
                    Restaurant
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-4xl leading-none text-[#1f1812]">{restaurant.name}</h3>
                      <p className="mt-3 text-sm text-[#6a5f56]">{formatAddress(restaurant.address)}</p>
                    </div>
                    <div className="rounded-2xl bg-[#f8efe4] px-3 py-2 text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#a6633b]">Starts</p>
                      <p className="mt-1 font-semibold text-[#1f1812]">
                        {restaurant.starting_price ? formatCurrency(restaurant.starting_price) : "NA"}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm leading-7 text-[#6a5f56]">
                    {restaurant.category_labels?.length
                      ? restaurant.category_labels.join(" • ")
                      : "Live menu categories will show here"}
                  </p>

                  <div className="rounded-[24px] bg-[#fcf5ec] p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#a6633b]">Featured</p>
                    <div className="mt-3 space-y-2">
                      {restaurant.featured_items?.slice(0, 2).map((item) => (
                        <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="line-clamp-2 font-medium text-[#1f1812]">{item.name}</span>
                          <span className="shrink-0 text-[#8e3f11]">{formatCurrency(item.display_price)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-6">
        <SectionHeader
          eyebrow="Stay discovery"
          title="Hotels powered by room and rate data"
          body="The hotel board pulls room type summaries, available room counts, and default pricing from the existing hotel collections already used by the owner dashboard."
          cta="Open all hotels"
          to="/hotels"
        />

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="soft-card h-72 animate-pulse rounded-[30px]" />
            ))}
          </div>
        ) : hotels.length === 0 ? (
          <div className="soft-card rounded-[30px] px-6 py-10 text-center text-[#6a5f56]">
            Hotel owners have not added room data yet. Once they do, this website starts surfacing it automatically.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {hotels.slice(0, 3).map((hotel) => (
              <Link
                key={hotel.id}
                to={`/hotels/${hotel.slug}`}
                className="soft-card group overflow-hidden rounded-[30px] transition hover:-translate-y-1"
              >
                <div className="relative h-52 overflow-hidden bg-[linear-gradient(135deg,#efddca_0%,#f6eadf_50%,#f0e4d7_100%)]">
                  {hotel.logo ? (
                    <img
                      src={hotel.logo}
                      alt={hotel.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#9b7a63]">
                      <Hotel className="h-10 w-10" />
                    </div>
                  )}
                  <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#245f52]">
                    Hotel
                  </div>
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-display text-4xl leading-none text-[#1f1812]">{hotel.name}</h3>
                      <p className="mt-3 text-sm text-[#6a5f56]">{formatAddress(hotel.address)}</p>
                    </div>
                    <div className="rounded-2xl bg-[#edf7f2] px-3 py-2 text-right">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#2e7d67]">From</p>
                      <p className="mt-1 font-semibold text-[#1f1812]">
                        {hotel.starting_price ? formatCurrency(hotel.starting_price) : "NA"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 rounded-[24px] bg-[#f7f2eb] p-4 text-sm">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#a6633b]">Available</p>
                      <p className="mt-1 font-semibold text-[#1f1812]">{hotel.available_rooms || 0} rooms</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-[#a6633b]">Room types</p>
                      <p className="mt-1 font-semibold text-[#1f1812]">{hotel.room_type_count || 0}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(hotel.room_type_labels || []).slice(0, 3).map((label) => (
                      <span key={label} className="rounded-full bg-[#f4e6d8] px-3 py-1 text-xs font-medium text-[#5d4d40]">
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

      <section className="soft-card rounded-[34px] p-6 sm:p-8">
        <SectionHeader
          eyebrow="Roadmap honesty"
          title="Cabs and flights stay visible, not fake-built"
          body="You asked to keep cars and flights unfinished for now, so this section makes that explicit. The frontend acknowledges those service lanes without pretending their backend is already ready."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {[
            {
              icon: CarFront,
              title: "Cab booking lane",
              body: "Driver registration, location sharing, and dispatch will connect later. The current card simply marks the slot in the product story.",
            },
            {
              icon: Ticket,
              title: "Flights and travel lane",
              body: "GDS-backed search and package building are staged after the hotel and restaurant journeys feel solid.",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-[28px] border border-dashed border-[rgba(96,73,53,0.2)] bg-[#fffaf4] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3e6d5] text-[#5d4d40]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1f1812]">{item.title}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#a6633b]">Coming later</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-[#6a5f56]">{item.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="glass-panel rounded-[34px] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[#a6633b]">WhatsApp handoff</p>
            <h2 className="font-display mt-3 text-5xl leading-none text-[#1f1812]">
              Keep the bot as the final action layer
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#6a5f56]">
              The website gives guests a manual browsing path. WhatsApp stays the fast handoff path
              for final confirmation, AI support, or future agentic flows.
            </p>
          </div>
          <a
            href={buildWhatsAppLink("Hi Zahi, I want help choosing a hotel or restaurant.")}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[#1f1812] px-5 py-3 text-sm font-semibold text-white"
          >
            Open WhatsApp handoff
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
