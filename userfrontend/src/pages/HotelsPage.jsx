import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BedDouble, CalendarDays, Hotel, Search, Users } from "lucide-react";

import marketplaceService from "../services/marketplaceService";
import { formatAddress, formatCurrency, formatDateRange } from "../lib/format";

const HotelsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availableOnly, setAvailableOnly] = useState(false);

  const query = searchParams.get("query") || "";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const guests = Number(searchParams.get("guests") || "2");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await marketplaceService.getHotels();
        if (active) {
          setHotels(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load hotels", error);
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

  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      const haystack = [
        hotel.name,
        hotel.address || "",
        hotel.tagline || "",
        hotel.property_type || "",
        ...(hotel.room_type_labels || []),
        ...(hotel.featured_amenities || []),
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = haystack.includes(query.toLowerCase());
      const matchesAvailability = !availableOnly || Number(hotel.available_rooms || 0) > 0;
      return matchesQuery && matchesAvailability;
    });
  }, [availableOnly, hotels, query]);

  const updateQuery = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("query", value);
    else next.delete("query");
    setSearchParams(next);
  };

  return (
    <div className="space-y-10">
      <section className="glass-panel rounded-[36px] px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#c15d1f]">Hotel lane</p>
            <h1 className="font-display mt-3 text-6xl leading-none text-[#1f1812]">Search stays from live tenant data</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#68584b]">
              This page behaves like a travel marketplace, but every price point, room type, and
              availability signal comes from your existing hotel workspace data.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="soft-card rounded-[24px] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Dates</p>
              <p className="mt-2 text-sm font-semibold text-[#1f1812]">
                {formatDateRange(checkIn, checkOut)}
              </p>
            </div>
            <div className="soft-card rounded-[24px] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Guests</p>
              <p className="mt-2 text-sm font-semibold text-[#1f1812]">{guests} travellers</p>
            </div>
            <div className="soft-card rounded-[24px] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Results</p>
              <p className="mt-2 text-sm font-semibold text-[#1f1812]">{filteredHotels.length} hotels</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_auto_auto]">
          <label className="soft-card flex items-center gap-3 rounded-full px-4 py-3">
            <Search className="h-4 w-4 text-[#8c7a6c]" />
            <input
              type="text"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder="Search hotels, areas, or room types"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#a89788]"
            />
          </label>
          <div className="soft-card inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm text-[#5d4d40]">
            <CalendarDays className="h-4 w-4" />
            {formatDateRange(checkIn, checkOut)}
          </div>
          <button
            type="button"
            onClick={() => setAvailableOnly((current) => !current)}
            className={`rounded-full px-4 py-3 text-sm font-medium ${
              availableOnly ? "bg-[#1f1812] text-white" : "soft-card text-[#5d4d40]"
            }`}
          >
            {availableOnly ? "Showing available only" : "Only available rooms"}
          </button>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="soft-card h-96 animate-pulse rounded-[32px]" />
          ))}
        </div>
      ) : filteredHotels.length === 0 ? (
        <div className="soft-card rounded-[34px] px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf7f2] text-[#2e7d67]">
            <BedDouble className="h-6 w-6" />
          </div>
          <h2 className="font-display mt-5 text-5xl text-[#1f1812]">No hotels match that search.</h2>
          <p className="mt-3 text-sm leading-7 text-[#68584b]">
            Try another location, clear the availability chip, or return later once more tenants
            publish live room data.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredHotels.map((hotel) => (
            <Link
              key={hotel.id}
              to={`/hotels/${hotel.slug}?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&guests=${guests}`}
              className="soft-card group overflow-hidden rounded-[32px] transition hover:-translate-y-1"
            >
              <div className="relative h-56 overflow-hidden bg-[linear-gradient(135deg,#efddca_0%,#f6eadf_50%,#f0e4d7_100%)]">
                {hotel.cover_image || hotel.logo ? (
                  <img
                    src={hotel.cover_image || hotel.logo}
                    alt={hotel.name}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[#9b7a63]">
                    <Hotel className="h-10 w-10" />
                  </div>
                )}
                <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#32695b]">
                  {hotel.available_rooms || 0} rooms open
                </div>
                {hotel.property_type ? (
                  <div className="absolute bottom-4 left-4 rounded-full bg-[#1f1812]/78 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-sm">
                    {hotel.property_type}
                  </div>
                ) : null}
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-4xl leading-none text-[#1f1812]">{hotel.name}</h2>
                    {hotel.tagline ? (
                      <p className="mt-3 text-sm font-medium text-[#8e3f11]">{hotel.tagline}</p>
                    ) : null}
                    <p className="mt-2 text-sm text-[#68584b]">{formatAddress(hotel.address)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#eef7f2] px-3 py-2 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#32695b]">From</p>
                    <p className="mt-1 font-semibold text-[#1f1812]">
                      {hotel.starting_price ? formatCurrency(hotel.starting_price) : "NA"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 rounded-[24px] bg-[#fbf6ef] p-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Total rooms</p>
                    <p className="mt-1 font-semibold text-[#1f1812]">{hotel.total_rooms || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Guest fit</p>
                    <p className="mt-1 inline-flex items-center gap-1 font-semibold text-[#1f1812]">
                      <Users className="h-4 w-4" />
                      {guests}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(hotel.featured_amenities || []).slice(0, 2).map((label) => (
                    <span key={label} className="rounded-full bg-[#eef7f2] px-3 py-1 text-xs font-medium text-[#32695b]">
                      {label}
                    </span>
                  ))}
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
    </div>
  );
};

export default HotelsPage;
