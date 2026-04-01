import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Clock3, Minus, Plus, ShoppingBag, Store } from "lucide-react";

import marketplaceService from "../services/marketplaceService";
import { buildWhatsAppLink, formatAddress, formatCurrency, shortText } from "../lib/format";

const RestaurantDetailPage = () => {
  const { slug } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({});

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await marketplaceService.getRestaurant(slug);
        if (active) {
          setRestaurant(data);
        }
      } catch (error) {
        console.error("Failed to load restaurant detail", error);
        if (active) {
          setRestaurant(null);
        }
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
  }, [slug]);

  const allItems = useMemo(
    () => restaurant?.menu_sections?.flatMap((section) => section.items || []) || [],
    [restaurant]
  );

  const cartLines = useMemo(() => {
    return allItems
      .filter((item) => cart[item.id] > 0)
      .map((item) => ({
        ...item,
        quantity: cart[item.id],
        total: (cart[item.id] || 0) * (item.display_price || 0),
      }));
  }, [allItems, cart]);

  const grandTotal = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.total, 0),
    [cartLines]
  );

  const updateQuantity = (itemId, nextQuantity) => {
    setCart((current) => {
      if (nextQuantity <= 0) {
        const clone = { ...current };
        delete clone[itemId];
        return clone;
      }
      return {
        ...current,
        [itemId]: nextQuantity,
      };
    });
  };

  const whatsappMessage = useMemo(() => {
    if (!restaurant) return "";
    const intro = `Hi Zahi, I want to place an order from ${restaurant.tenant?.name || "this restaurant"}.`;
    if (cartLines.length === 0) {
      return `${intro} Please help me choose dishes.`;
    }

    const lines = cartLines.map(
      (line) => `- ${line.name} x${line.quantity} (${formatCurrency(line.total)})`
    );
    return `${intro}\n${lines.join("\n")}\nTotal: ${formatCurrency(grandTotal)}`;
  }, [cartLines, grandTotal, restaurant]);

  if (loading) {
    return <div className="soft-card h-[30rem] animate-pulse rounded-[34px]" />;
  }

  if (!restaurant) {
    return (
      <div className="soft-card rounded-[34px] px-6 py-14 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f3e6d5] text-[#8e3f11]">
          <Store className="h-6 w-6" />
        </div>
        <h1 className="font-display mt-5 text-5xl text-[#1f1812]">Restaurant not found</h1>
        <p className="mt-4 text-sm leading-7 text-[#6a5f56]">
          The tenant may have been removed or does not have marketplace data yet.
        </p>
        <Link
          to="/restaurants"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#1f1812] px-5 py-3 text-sm font-semibold text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Link to="/restaurants" className="inline-flex items-center gap-2 text-sm font-medium text-[#8e3f11]">
        <ArrowLeft className="h-4 w-4" />
        Back to restaurants
      </Link>

      <section className="glass-panel overflow-hidden rounded-[36px]">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative min-h-[22rem] bg-[#f2dfcd]">
            {restaurant.summary?.cover_image ? (
              <img
                src={restaurant.summary.cover_image}
                alt={restaurant.tenant?.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[#b88c6e]">
                <Store className="h-12 w-12" />
              </div>
            )}
          </div>
          <div className="space-y-6 px-6 py-7 sm:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-[#a6633b]">Restaurant detail</p>
              <h1 className="font-display mt-4 text-6xl leading-none text-[#1f1812]">
                {restaurant.tenant?.name}
              </h1>
              <p className="mt-5 text-sm leading-7 text-[#6a5f56]">
                {formatAddress(restaurant.tenant?.address)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[26px] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a6633b]">Starting price</p>
                <p className="mt-2 font-semibold text-[#1f1812]">
                  {restaurant.summary?.starting_price ? formatCurrency(restaurant.summary.starting_price) : "NA"}
                </p>
              </div>
              <div className="rounded-[26px] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a6633b]">Categories</p>
                <p className="mt-2 font-semibold text-[#1f1812]">{restaurant.categories?.length || 0}</p>
              </div>
              <div className="rounded-[26px] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a6633b]">Items live</p>
                <p className="mt-2 font-semibold text-[#1f1812]">{restaurant.summary?.available_item_count || 0}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(restaurant.summary?.category_labels || []).map((label) => (
                <span key={label} className="rounded-full bg-[#f4e6d8] px-3 py-1 text-xs font-medium text-[#5d4d40]">
                  {label}
                </span>
              ))}
            </div>

            <a
              href={buildWhatsAppLink(whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex rounded-full bg-[#1f1812] px-5 py-3 text-sm font-semibold text-white"
            >
              Continue on WhatsApp
            </a>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          {(restaurant.menu_sections || []).map((section) => (
            <section key={section.id} className="soft-card rounded-[32px] p-5 sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-[#a6633b]">Section</p>
                  <h2 className="font-display mt-3 text-5xl leading-none text-[#1f1812]">
                    {section.name}
                  </h2>
                  {section.description ? (
                    <p className="mt-3 text-sm leading-7 text-[#6a5f56]">{section.description}</p>
                  ) : null}
                </div>
                <span className="rounded-full bg-[#f8efe4] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8e3f11]">
                  {section.item_count} items
                </span>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {(section.items || []).map((item) => {
                  const quantity = cart[item.id] || 0;
                  return (
                    <article key={item.id} className="rounded-[28px] border border-[rgba(96,73,53,0.12)] bg-[#fffdf9] p-4">
                      <div className="flex gap-4">
                        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-[22px] bg-[#f2dfcd]">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[#b88c6e]">
                              <Store className="h-6 w-6" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h3 className="text-lg font-semibold text-[#1f1812]">{item.name}</h3>
                              <p className="mt-2 text-sm leading-6 text-[#6a5f56]">
                                {shortText(item.description, 96) || "Freshly prepared and ready to serve."}
                              </p>
                            </div>
                            <span className="rounded-full bg-[#eef7f3] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2e7d67]">
                              {item.food_type === "veg" ? "Veg" : "Non-veg"}
                            </span>
                          </div>

                          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-4">
                            <div>
                              <p className="text-lg font-semibold text-[#1f1812]">{formatCurrency(item.display_price)}</p>
                              <p className="mt-1 inline-flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-[#8a7869]">
                                <Clock3 className="h-3.5 w-3.5" />
                                {item.prep_time_minutes} mins
                              </p>
                            </div>

                            {quantity > 0 ? (
                              <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(96,73,53,0.14)] bg-white px-2 py-2">
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, quantity - 1)}
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f5ebdf]"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="min-w-6 text-center text-sm font-semibold text-[#1f1812]">{quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => updateQuantity(item.id, quantity + 1)}
                                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1f1812] text-white"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, 1)}
                                className="rounded-full bg-[#1f1812] px-4 py-2 text-sm font-semibold text-white"
                              >
                                Add to cart
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="soft-card rounded-[32px] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f1812] text-white">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#a6633b]">Local cart</p>
                <h2 className="font-display text-4xl leading-none text-[#1f1812]">Order summary</h2>
              </div>
            </div>

            {cartLines.length === 0 ? (
              <div className="mt-5 rounded-[24px] bg-[#fcf5ec] px-4 py-6 text-sm leading-7 text-[#6a5f56]">
                Build a cart here, then hand the order to WhatsApp for the final step.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {cartLines.map((line) => (
                  <div key={line.id} className="rounded-[24px] bg-[#fcf5ec] px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-[#1f1812]">{line.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#8a7869]">
                          Qty {line.quantity}
                        </p>
                      </div>
                      <p className="font-semibold text-[#8e3f11]">{formatCurrency(line.total)}</p>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between rounded-[24px] border border-[rgba(96,73,53,0.12)] bg-white px-4 py-4">
                  <span className="text-sm font-medium text-[#6a5f56]">Grand total</span>
                  <span className="text-lg font-semibold text-[#1f1812]">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            )}

            <a
              href={buildWhatsAppLink(whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#1f1812] px-5 py-3 text-sm font-semibold text-white"
            >
              Send to WhatsApp
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default RestaurantDetailPage;
