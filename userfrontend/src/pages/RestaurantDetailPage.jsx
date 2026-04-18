import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  MapPin,
  Minus,
  Phone,
  Plus,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import { loadRazorpayScript } from "../lib/razorpay";
import useCustomerLocation from "../hooks/useCustomerLocation";
import { buildWhatsAppLink, formatAddress, formatCurrency, formatDistance, shortText } from "../lib/format";
import bookingService from "../services/bookingService";
import marketplaceService from "../services/marketplaceService";

const RestaurantDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const { coordinates } = useCustomerLocation(true);
  const coordinateKey = coordinates
    ? `${coordinates.latitude.toFixed(5)}:${coordinates.longitude.toFixed(5)}`
    : "no-location";
  const [searchParams] = useSearchParams();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [payingNow, setPayingNow] = useState(false);
  const [notes, setNotes] = useState("");
  const [activeGalleryIndex, setActiveGalleryIndex] = useState(0);
  const diners = Number(searchParams.get("diners") || "2");
  const focusedItemId = searchParams.get("focus");
  const shopGalleryImages = useMemo(() => {
    const images = [
      restaurant?.summary?.cover_image,
      ...(restaurant?.summary?.gallery_image_urls || []),
      ...(restaurant?.profile?.gallery_image_urls || []),
    ]
      .filter(Boolean)
      .filter((value, index, list) => list.indexOf(value) === index);

    return images;
  }, [restaurant]);
  const serviceModeLabels = useMemo(
    () =>
      (restaurant?.profile?.service_modes || [])
        .map((mode) => String(mode).replaceAll("_", " "))
        .filter(Boolean),
    [restaurant]
  );
  const currentGalleryImage = shopGalleryImages[activeGalleryIndex] || restaurant?.summary?.cover_image;
  const shopLocationLine = useMemo(
    () =>
      [
        restaurant?.profile?.area_name,
        restaurant?.profile?.city,
        restaurant?.profile?.state,
      ]
        .filter(Boolean)
        .join(", ") || formatAddress(restaurant?.tenant?.address),
    [restaurant]
  );

  const visibleSections = useMemo(
    () =>
      (restaurant?.menu_sections || [])
        .map((section) => ({
          ...section,
          items: (section.items || []).filter((item) => item.is_available),
        }))
        .filter((section) => section.items.length > 0),
    [restaurant]
  );

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await marketplaceService.getRestaurant(
          slug,
          coordinates
            ? {
                latitude: coordinates.latitude,
                longitude: coordinates.longitude,
              }
            : undefined
        );
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
  }, [coordinateKey, slug]);

  useEffect(() => {
    if (!focusedItemId || loading) return;

    const target = document.getElementById(`dish-${focusedItemId}`);
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedItemId, loading, visibleSections]);

  useEffect(() => {
    setActiveGalleryIndex(0);
  }, [slug]);

  useEffect(() => {
    if (!shopGalleryImages.length) {
      setActiveGalleryIndex(0);
      return;
    }

    setActiveGalleryIndex((current) => (current >= shopGalleryImages.length ? 0 : current));
  }, [shopGalleryImages.length]);

  const allItems = useMemo(
    () => visibleSections.flatMap((section) => section.items || []),
    [visibleSections]
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

  const browseGallery = (direction) => {
    if (!shopGalleryImages.length) return;

    setActiveGalleryIndex(
      (current) => (current + direction + shopGalleryImages.length) % shopGalleryImages.length
    );
  };

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
      return `${intro} Please help me choose dishes for ${diners} diners.`;
    }

    const lines = cartLines.map(
      (line) => `- ${line.name} x${line.quantity} (${formatCurrency(line.total)})`
    );
    const noteLine = notes ? `Notes: ${notes}` : "";
    return `${intro}\n${lines.join("\n")}\nParty size: ${diners}\n${noteLine}\nTotal: ${formatCurrency(grandTotal)}`;
  }, [cartLines, diners, grandTotal, notes, restaurant]);

  const submitOrderRequest = async () => {
    if (!restaurant) return;
    if (cartLines.length === 0) {
      toast.error("Add at least one dish before saving the request.");
      return;
    }
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }

    setSubmitting(true);
    try {
      await bookingService.createRequest({
        service_type: "restaurant",
        title: `Dining request for ${restaurant.tenant?.name}`,
        summary: `${cartLines.length} item(s), ${diners} diner(s), total ${formatCurrency(grandTotal)}`,
        tenant_id: restaurant.tenant?.id || null,
        tenant_slug: restaurant.tenant?.slug || null,
        tenant_name: restaurant.tenant?.name || null,
        total_amount: grandTotal,
        metadata: {
          diners,
          notes,
          items: cartLines.map((line) => ({
            id: line.id,
            name: line.name,
            quantity: line.quantity,
            unit_price: line.display_price,
            total: line.total,
          })),
        },
      });
      toast.success("Restaurant request saved to your account.");
      navigate("/account");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not save the restaurant request.");
    } finally {
      setSubmitting(false);
    }
  };

  const startRazorpayPayment = async () => {
    if (!restaurant) return;
    if (cartLines.length === 0) {
      toast.error("Add at least one dish before starting payment.");
      return;
    }
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }

    setPayingNow(true);

    try {
      const checkoutData = await bookingService.createPaymentCheckout({
        service_type: "restaurant",
        title: `Paid order for ${restaurant.tenant?.name}`,
        summary: `${cartLines.length} item(s), ${diners} diner(s), total ${formatCurrency(grandTotal)}`,
        tenant_id: restaurant.tenant?.id || null,
        tenant_slug: restaurant.tenant?.slug || null,
        tenant_name: restaurant.tenant?.name || null,
        total_amount: grandTotal,
        metadata: {
          diners,
          notes,
          items: cartLines.map((line) => ({
            id: line.id,
            name: line.name,
            quantity: line.quantity,
            unit_price: line.display_price,
            total: line.total,
          })),
        },
      });

      const razorpayLoaded = await loadRazorpayScript();
      if (!razorpayLoaded || !window.Razorpay) {
        throw new Error("Razorpay checkout could not be loaded.");
      }

      const razorpay = new window.Razorpay({
        ...checkoutData.checkout,
        theme: {
          color: "#c8632c",
        },
        handler: async (paymentResult) => {
          try {
            await bookingService.verifyPayment({
              payment_order_id: checkoutData.payment_order_id,
              razorpay_order_id: paymentResult.razorpay_order_id,
              razorpay_payment_id: paymentResult.razorpay_payment_id,
              razorpay_signature: paymentResult.razorpay_signature,
            });
            toast.success("Payment completed and your order was saved.");
            navigate("/account");
          } catch (verificationError) {
            console.error("Restaurant payment verification failed", verificationError);
            toast.error(
              verificationError.response?.data?.detail ||
                "Payment was received, but order confirmation failed."
            );
            setPayingNow(false);
          }
        },
        modal: {
          ondismiss: () => {
            setPayingNow(false);
          },
        },
      });

      razorpay.open();
    } catch (error) {
      console.error("Failed to start restaurant payment", error);
      toast.error(
        error.response?.data?.detail ||
          error.message ||
          "Could not start the payment right now."
      );
      setPayingNow(false);
    }
  };

  if (loading) {
    return <div className="soft-card h-[30rem] animate-pulse rounded-[36px]" />;
  }

  if (!restaurant) {
    return (
      <div className="soft-card rounded-[36px] px-6 py-14 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f3e6d5] text-[#8e3f11]">
          <Store className="h-6 w-6" />
        </div>
        <h1 className="font-display mt-5 text-5xl text-[#1f1812]">Restaurant not found</h1>
        <p className="mt-4 text-sm leading-7 text-[#68584b]">
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

      <section className="glass-panel overflow-hidden rounded-[40px]">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col bg-[#f2dfcd]">
            <div className="relative min-h-[24rem]">
              {currentGalleryImage ? (
                <img
                  src={currentGalleryImage}
                  alt={restaurant.tenant?.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-[#b88c6e]">
                  <Store className="h-12 w-12" />
                </div>
              )}
              <div className="absolute left-6 top-6 rounded-full bg-white/92 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#a54d16]">
                {restaurant.summary?.available_item_count || 0} dishes live
              </div>
              {shopGalleryImages.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={() => browseGallery(-1)}
                    className="absolute left-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/88 text-[#1f1812] shadow-[0_12px_28px_rgba(31,24,18,0.12)] transition hover:bg-white"
                    aria-label="Previous restaurant image"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => browseGallery(1)}
                    className="absolute right-4 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/88 text-[#1f1812] shadow-[0_12px_28px_rgba(31,24,18,0.12)] transition hover:bg-white"
                    aria-label="Next restaurant image"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-5 right-5 rounded-full bg-[#1f1812]/72 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                    {activeGalleryIndex + 1} / {shopGalleryImages.length}
                  </div>
                </>
              ) : null}
            </div>

            {shopGalleryImages.length > 1 ? (
              <div className="flex gap-3 overflow-x-auto px-4 py-4">
                {shopGalleryImages.map((imageUrl, index) => (
                  <button
                    key={`${imageUrl}-${index}`}
                    type="button"
                    onClick={() => setActiveGalleryIndex(index)}
                    className={`h-20 w-24 shrink-0 overflow-hidden rounded-[20px] border-2 transition ${
                      index === activeGalleryIndex
                        ? "border-[#1f1812] shadow-[0_12px_24px_rgba(31,24,18,0.14)]"
                        : "border-white/50 opacity-80"
                    }`}
                    aria-label={`Show restaurant image ${index + 1}`}
                  >
                    <img
                      src={imageUrl}
                      alt={`${restaurant.tenant?.name} thumbnail ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="space-y-6 px-6 py-7 sm:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#c15d1f]">Restaurant detail</p>
              <h1 className="font-display mt-4 text-6xl leading-none text-[#1f1812]">
                {restaurant.tenant?.name}
              </h1>
              {restaurant.profile?.tagline ? (
                <p className="mt-4 text-base font-medium text-[#8e3f11]">{restaurant.profile.tagline}</p>
              ) : null}
              <p className="mt-5 text-sm leading-7 text-[#68584b]">
                {formatAddress(restaurant.tenant?.address)}
              </p>
              {restaurant.summary?.distance_km !== null &&
              restaurant.summary?.distance_km !== undefined ? (
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#a54d16]">
                  {formatDistance(restaurant.summary.distance_km)}
                </p>
              ) : null}
              {restaurant.profile?.description ? (
                <p className="mt-5 max-w-3xl text-sm leading-7 text-[#68584b]">
                  {restaurant.profile.description}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <div className="rounded-[26px] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Starting price</p>
                <p className="mt-2 font-semibold text-[#1f1812]">
                  {restaurant.summary?.starting_price ? formatCurrency(restaurant.summary.starting_price) : "NA"}
                </p>
              </div>
              <div className="rounded-[26px] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Categories</p>
                <p className="mt-2 font-semibold text-[#1f1812]">{restaurant.categories?.length || 0}</p>
              </div>
              <div className="rounded-[26px] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Party size</p>
                <p className="mt-2 inline-flex items-center gap-1 font-semibold text-[#1f1812]">
                  <Users className="h-4 w-4" />
                  {diners}
                </p>
              </div>
              <div className="rounded-[26px] bg-white p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Hours</p>
                <p className="mt-2 inline-flex items-center gap-1 font-semibold text-[#1f1812]">
                  <Clock3 className="h-4 w-4" />
                  {(restaurant.profile?.opening_time || "09:00") +
                    " - " +
                    (restaurant.profile?.closing_time || "22:00")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {(restaurant.summary?.category_labels || []).map((label) => (
                <span key={label} className="rounded-full bg-[#f4e6d8] px-3 py-1 text-xs font-medium text-[#5d4d40]">
                  {label}
                </span>
              ))}
              {serviceModeLabels.map((label) => (
                <span key={label} className="rounded-full bg-[#eef7f3] px-3 py-1 text-xs font-medium capitalize text-[#2e7d67]">
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="soft-card rounded-[34px] p-5 sm:p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Shop details</p>
          <h2 className="font-display mt-3 text-5xl leading-none text-[#1f1812]">
            About this restaurant
          </h2>

          <div className="mt-6 space-y-3">
            <div className="rounded-[24px] bg-[#fff9f2] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Location</p>
              <p className="mt-2 inline-flex items-start gap-2 text-sm font-medium leading-6 text-[#1f1812]">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8e3f11]" />
                <span>{shopLocationLine}</span>
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[24px] bg-[#fff9f2] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Reservation line</p>
                <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#1f1812]">
                  <Phone className="h-4 w-4 text-[#8e3f11]" />
                  {restaurant.profile?.reservation_phone ||
                    restaurant.profile?.whatsapp_number ||
                    restaurant.tenant?.phone ||
                    "Not added"}
                </p>
              </div>
              <div className="rounded-[24px] bg-[#fff9f2] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Customer email</p>
                <p className="mt-2 text-sm font-medium text-[#1f1812]">
                  {restaurant.profile?.contact_email || restaurant.tenant?.email || "Not added"}
                </p>
              </div>
            </div>

            {restaurant.profile?.map_link ? (
              <a
                href={restaurant.profile.map_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 text-sm font-semibold text-[#1f1812] transition hover:bg-[#fff7ef]"
              >
                Open location on map
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </div>

        <div className="soft-card rounded-[34px] p-5 sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Shop gallery</p>
              <h2 className="font-display mt-3 text-5xl leading-none text-[#1f1812]">
                Restaurant images
              </h2>
            </div>
            <span className="rounded-full bg-[#fbefe4] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#a54d16]">
              {shopGalleryImages.length} photos
            </span>
          </div>

          {shopGalleryImages.length > 0 ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {shopGalleryImages.slice(0, 6).map((imageUrl, index) => (
                <button
                  key={`${imageUrl}-${index}`}
                  type="button"
                  onClick={() => setActiveGalleryIndex(index)}
                  className={`overflow-hidden rounded-[28px] bg-[#f2dfcd] text-left transition ${
                    index === 0 ? "sm:col-span-2" : ""
                  } ${
                    index === activeGalleryIndex
                      ? "ring-2 ring-[#1f1812] ring-offset-2 ring-offset-[#fff9f2]"
                      : ""
                  }`}
                >
                  <img
                    src={imageUrl}
                    alt={`${restaurant.tenant?.name} ${index + 1}`}
                    className={`w-full object-cover ${index === 0 ? "h-64" : "h-40"}`}
                  />
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[28px] bg-[#fff9f2] px-5 py-12 text-center text-sm leading-7 text-[#68584b]">
              Shop images have not been added yet. The restaurant can upload cover and gallery
              photos from the workspace settings.
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] xl:grid-cols-[1.3fr_0.7fr]">
        <div className="space-y-6">
          {visibleSections.length === 0 ? (
            <section className="soft-card rounded-[34px] px-6 py-12 text-center">
              <h2 className="font-display text-5xl text-[#1f1812]">No live dishes right now</h2>
              <p className="mt-4 text-sm leading-7 text-[#68584b]">
                This restaurant is visible in the portal, but it does not currently have any
                available menu items for customers.
              </p>
            </section>
          ) : (
            visibleSections.map((section) => (
              <section key={section.id} className="soft-card rounded-[34px] p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Section</p>
                    <h2 className="font-display mt-3 text-5xl leading-none text-[#1f1812]">
                      {section.name}
                    </h2>
                    {section.description ? (
                      <p className="mt-3 text-sm leading-7 text-[#68584b]">{section.description}</p>
                    ) : null}
                  </div>
                  <span className="rounded-full bg-[#fbefe4] px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#a54d16]">
                    {section.items.length} items
                  </span>
                </div>

                <div className="mt-6 grid gap-4 xl:grid-cols-2">
                  {(section.items || []).map((item) => {
                    const quantity = cart[item.id] || 0;
                    return (
                      <article
                        id={`dish-${item.id}`}
                        key={item.id}
                        className={`rounded-[28px] border p-4 transition ${
                          focusedItemId === item.id
                            ? "border-[rgba(214,106,47,0.34)] bg-[#fff7ef] shadow-[0_18px_44px_rgba(140,63,17,0.08)]"
                            : "border-[rgba(96,73,53,0.12)] bg-[#fffdf9]"
                        }`}
                      >
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
                                <p className="mt-2 text-sm leading-6 text-[#68584b]">
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
            ))
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="soft-card rounded-[34px] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f1812] text-white">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Cart</p>
                <h2 className="font-display text-4xl leading-none text-[#1f1812]">Save this request</h2>
              </div>
            </div>

            {cartLines.length === 0 ? (
              <div className="mt-5 rounded-[24px] bg-[#fcf5ec] px-4 py-6 text-sm leading-7 text-[#68584b]">
                Build a cart here, then save it into your account or hand it to WhatsApp for final confirmation.
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
                  <span className="text-sm font-medium text-[#68584b]">Grand total</span>
                  <span className="text-lg font-semibold text-[#1f1812]">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            )}

            <label className="mt-4 block">
              <span className="mb-2 block text-sm font-medium text-[#3f342a]">Notes for the restaurant</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Spice level, delivery note, dine-in preference..."
                className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#8e3f11]"
              />
            </label>

            <button
              type="button"
              onClick={submitOrderRequest}
              disabled={submitting || payingNow}
              className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#1f1812] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? "Saving request..." : isAuthenticated ? "Save food request" : "Sign in to save"}
            </button>

            <button
              type="button"
              onClick={startRazorpayPayment}
              disabled={submitting || payingNow}
              className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-[#c8632c] px-5 py-3 text-sm font-semibold text-[#fffaf4] shadow-[0_16px_32px_rgba(104,47,18,0.16)] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {payingNow
                ? "Opening payment..."
                : isAuthenticated
                  ? `Pay ${formatCurrency(grandTotal)} with Razorpay`
                  : "Sign in to pay"}
            </button>

            <a
              href={buildWhatsAppLink(whatsappMessage)}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-[rgba(96,73,53,0.14)] bg-white px-5 py-3 text-sm font-semibold text-[#1f1812]"
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
