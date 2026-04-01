import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BedDouble, Hotel, Search } from "lucide-react";

import marketplaceService from "../services/marketplaceService";
import { formatAddress, formatCurrency } from "../lib/format";

const HotelsPage = () => {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

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
      const haystack = `${hotel.name} ${hotel.address || ""} ${(hotel.room_type_labels || []).join(" ")}`.toLowerCase();
      return haystack.includes(search.toLowerCase());
    });
  }, [hotels, search]);

  return (
    <div className="space-y-10">
      <section className="glass-panel rounded-[34px] px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.26em] text-[#a6633b]">Hotel marketplace</p>
            <h1 className="font-display mt-3 text-6xl leading-none text-[#1f1812]">Stay options from live hotel data</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#6a5f56]">
              This board reads room inventory, room types, and pricing defaults already managed inside the existing hotel dashboard.
            </p>
          </div>

          <div className="soft-card flex max-w-xl flex-1 items-center gap-3 rounded-full px-4 py-3">
            <Search className="h-4 w-4 text-[#8c7a6c]" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search hotels, areas, or room types"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#a89788]"
            />
          </div>
        </div>
      </section>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="soft-card h-96 animate-pulse rounded-[30px]" />
          ))}
        </div>
      ) : filteredHotels.length === 0 ? (
        <div className="soft-card rounded-[30px] px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#edf7f2] text-[#2e7d67]">
            <BedDouble className="h-6 w-6" />
          </div>
          <h2 className="font-display mt-5 text-4xl text-[#1f1812]">No hotels match that search.</h2>
          <p className="mt-3 text-sm leading-7 text-[#6a5f56]">
            Try another place name or clear the search to view all live hotel tenants.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredHotels.map((hotel) => (
            <Link
              key={hotel.id}
              to={`/hotels/${hotel.slug}`}
              className="soft-card group overflow-hidden rounded-[30px] transition hover:-translate-y-1"
            >
              <div className="relative h-56 overflow-hidden bg-[linear-gradient(135deg,#efddca_0%,#f6eadf_50%,#f0e4d7_100%)]">
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
                <div className="absolute left-4 top-4 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#245f52]">
                  {hotel.available_rooms || 0} rooms free
                </div>
              </div>

              <div className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-display text-4xl leading-none text-[#1f1812]">{hotel.name}</h2>
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
                    <p className="text-xs uppercase tracking-[0.18em] text-[#a6633b]">Total rooms</p>
                    <p className="mt-1 font-semibold text-[#1f1812]">{hotel.total_rooms || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-[#a6633b]">Room types</p>
                    <p className="mt-1 font-semibold text-[#1f1812]">{hotel.room_type_count || 0}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(hotel.room_type_labels || []).map((label) => (
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
