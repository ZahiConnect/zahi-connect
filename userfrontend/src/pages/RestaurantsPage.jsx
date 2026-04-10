import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChefHat, Search, Store, Users } from "lucide-react";

import marketplaceService from "../services/marketplaceService";
import { formatAddress, formatCurrency, shortText } from "../lib/format";

const RestaurantsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTag, setActiveTag] = useState("all");

  const query = searchParams.get("query") || "";
  const diners = Number(searchParams.get("diners") || "2");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await marketplaceService.getRestaurants();
        if (active) {
          setRestaurants(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load restaurants", error);
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

  const allTags = useMemo(() => {
    const tags = new Set();
    restaurants.forEach((restaurant) => {
      (restaurant.category_labels || []).forEach((label) => tags.add(label));
    });
    return ["all", ...Array.from(tags)];
  }, [restaurants]);

  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((restaurant) => {
      const haystack = `${restaurant.name} ${restaurant.address || ""} ${(restaurant.category_labels || []).join(" ")}`.toLowerCase();
      const matchesSearch = haystack.includes(query.toLowerCase());
      const matchesTag =
        activeTag === "all" || (restaurant.category_labels || []).some((label) => label === activeTag);
      return matchesSearch && matchesTag;
    });
  }, [activeTag, query, restaurants]);

  const updateQuery = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set("query", value);
    else next.delete("query");
    setSearchParams(next);
  };

  return (
    <div className="space-y-10">
      <section className="glass-panel rounded-[36px] px-6 py-8 sm:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#c15d1f]">Restaurant lane</p>
            <h1 className="font-display mt-3 text-6xl leading-none text-[#1f1812]">Browse every live menu</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#68584b]">
              This surface behaves like a customer ordering board while still reading directly from
              the owner-managed restaurant data already sitting in your database.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="soft-card rounded-[24px] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Results</p>
              <p className="mt-2 text-sm font-semibold text-[#1f1812]">{filteredRestaurants.length} restaurants</p>
            </div>
            <div className="soft-card rounded-[24px] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Party size</p>
              <p className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#1f1812]">
                <Users className="h-4 w-4" />
                {diners} diners
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.4fr_auto]">
          <label className="soft-card flex items-center gap-3 rounded-full px-4 py-3">
            <Search className="h-4 w-4 text-[#8c7a6c]" />
            <input
              type="text"
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder="Search restaurants or cuisine lanes"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#a89788]"
            />
          </label>
          <div className="soft-card inline-flex items-center gap-2 rounded-full px-4 py-3 text-sm text-[#5d4d40]">
            <Users className="h-4 w-4" />
            {diners} diners
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {allTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => setActiveTag(tag)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                activeTag === tag
                  ? "bg-[#1f1812] text-white"
                  : "bg-white text-[#5d4d40] shadow-sm"
              }`}
            >
              {tag === "all" ? "All menus" : tag}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="soft-card h-96 animate-pulse rounded-[32px]" />
          ))}
        </div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="soft-card rounded-[34px] px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f3e6d5] text-[#8e3f11]">
            <ChefHat className="h-6 w-6" />
          </div>
          <h2 className="font-display mt-5 text-5xl text-[#1f1812]">No restaurants match that filter.</h2>
          <p className="mt-3 text-sm leading-7 text-[#68584b]">
            Try another keyword or clear the cuisine chip to reveal the full list again.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredRestaurants.map((restaurant) => (
            <Link
              key={restaurant.id}
              to={`/restaurants/${restaurant.slug}?diners=${diners}`}
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
                    <h2 className="font-display text-4xl leading-none text-[#1f1812]">{restaurant.name}</h2>
                    <p className="mt-3 text-sm text-[#68584b]">{formatAddress(restaurant.address)}</p>
                  </div>
                  <div className="rounded-2xl bg-[#fbefe4] px-3 py-2 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-[#a54d16]">Starts</p>
                    <p className="mt-1 font-semibold text-[#1f1812]">
                      {restaurant.starting_price ? formatCurrency(restaurant.starting_price) : "NA"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(restaurant.category_labels || []).slice(0, 3).map((label) => (
                    <span key={label} className="rounded-full bg-[#f4e6d8] px-3 py-1 text-xs font-medium text-[#5d4d40]">
                      {label}
                    </span>
                  ))}
                </div>

                <div className="rounded-[24px] bg-[#fcf5ec] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Menu preview</p>
                  <div className="mt-3 space-y-3">
                    {(restaurant.featured_items || []).slice(0, 2).map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                        <div>
                          <p className="font-medium text-[#1f1812]">{item.name}</p>
                          <p className="mt-1 text-xs leading-6 text-[#7a6a5d]">{shortText(item.description, 56)}</p>
                        </div>
                        <span className="shrink-0 font-medium text-[#8e3f11]">{formatCurrency(item.display_price)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantsPage;
