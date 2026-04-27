import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiArrowLeft, FiMapPin, FiPhone, FiMail, FiExternalLink, 
  FiClock, FiMinus, FiPlus, FiShoppingBag, FiInfo
} from "react-icons/fi";
import { BiRestaurant, BiChevronLeft, BiChevronRight } from "react-icons/bi";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import { loadRazorpayScript } from "../lib/razorpay";
import useCustomerLocation from "../hooks/useCustomerLocation";
import { buildWhatsAppLink, formatAddress, formatCurrency, formatDistance, shortText } from "../lib/format";
import bookingService from "../services/bookingService";
import marketplaceService from "../services/marketplaceService";

const DELIVERY_FEE = 40;

const RestaurantDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const { coordinates, locationLabel } = useCustomerLocation(true);
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
  const [autoAddedItemId, setAutoAddedItemId] = useState(null);

  const focusedItemId = searchParams.get("focus");
  const shouldAutoAddFocusedItem = searchParams.get("add") === "1";
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
      setLoading(true);
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
    setAutoAddedItemId(null);
  }, [focusedItemId, slug]);

  useEffect(() => {
    if (!focusedItemId || loading) return;

    const target = document.getElementById(`dish-${focusedItemId}`);
    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusedItemId, loading, visibleSections]);

  useEffect(() => {
    if (!shouldAutoAddFocusedItem || !focusedItemId || loading) return;

    const autoAddKey = `${slug}:${focusedItemId}`;
    if (autoAddedItemId === autoAddKey) return;

    const focusedItem = visibleSections
      .flatMap((section) => section.items || [])
      .find((item) => String(item.id) === String(focusedItemId));

    if (!focusedItem) return;

    if (cart[focusedItem.id] > 0) {
      setAutoAddedItemId(autoAddKey);
      return;
    }

    setCart((current) => {
      if (current[focusedItem.id] > 0) return current;
      return {
        ...current,
        [focusedItem.id]: 1,
      };
    });
    setAutoAddedItemId(autoAddKey);
    toast.success(`${focusedItem.name} added to cart.`);
  }, [
    autoAddedItemId,
    cart,
    focusedItemId,
    loading,
    shouldAutoAddFocusedItem,
    slug,
    visibleSections,
  ]);

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

  const cartSubtotal = useMemo(
    () => cartLines.reduce((sum, line) => sum + line.total, 0),
    [cartLines]
  );
  const deliveryFee = cartLines.length > 0 ? DELIVERY_FEE : 0;
  const grandTotal = cartSubtotal + deliveryFee;

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
      return `${intro} Please help me choose dishes.`;
    }

    const lines = cartLines.map(
      (line) => `- ${line.name} x${line.quantity} (${formatCurrency(line.total)})`
    );
    const noteLine = notes ? `Notes: ${notes}` : "";
    return `${intro}\n${lines.join("\n")}\nDelivery fee: ${formatCurrency(deliveryFee)}\n${noteLine}\nTotal: ${formatCurrency(grandTotal)}`;
  }, [cartLines, deliveryFee, grandTotal, notes, restaurant]);

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
        summary: `${cartLines.length} item(s), delivery ${formatCurrency(deliveryFee)}, total ${formatCurrency(grandTotal)}`,
        tenant_id: restaurant.tenant?.id || null,
        tenant_slug: restaurant.tenant?.slug || null,
        tenant_name: restaurant.tenant?.name || null,
        total_amount: grandTotal,
        metadata: {
          subtotal: cartSubtotal,
          delivery_fee: deliveryFee,
          notes,
          delivery_address: user?.address || locationLabel || "",
          customer_phone: user?.mobile || "",
          location_label: locationLabel || "",
          restaurant_phone: restaurant?.profile?.phone || restaurant?.summary?.phone || "",
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
      navigate("/activity");
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
        summary: `${cartLines.length} item(s), delivery ${formatCurrency(deliveryFee)}, total ${formatCurrency(grandTotal)}`,
        tenant_id: restaurant.tenant?.id || null,
        tenant_slug: restaurant.tenant?.slug || null,
        tenant_name: restaurant.tenant?.name || null,
        total_amount: grandTotal,
        metadata: {
          subtotal: cartSubtotal,
          delivery_fee: deliveryFee,
          notes,
          delivery_address: user?.address || locationLabel || "",
          customer_phone: user?.mobile || "",
          location_label: locationLabel || "",
          restaurant_phone: restaurant?.profile?.phone || restaurant?.summary?.phone || "",
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
            navigate("/activity");
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
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-3xl mt-6 mx-4 sm:mx-8">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 mb-6">
          <BiRestaurant className="text-4xl" />
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Location unavailable</h1>
        <p className="text-gray-500 max-w-md mb-8">
          The restaurant may have been removed or does not have marketplace data yet.
        </p>
        <Link
          to="/restaurants"
          className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3 rounded-full font-semibold hover:bg-black transition-colors"
        >
          <FiArrowLeft />
          Back to restaurants
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-white rounded-[32px] sm:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden lg:overflow-visible mb-12 pb-24 pt-4">
      {/* Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <Link to="/restaurants" className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors bg-white px-4 py-2 rounded-full shadow-sm border border-gray-100 w-fit">
          <FiArrowLeft />
          Back to food
        </Link>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        {/* Left Column: Details & Menu */}
        <div className="space-y-8">
          
          {/* Hero Section */}
          <motion.section 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100 flex flex-col relative"
          >
            {/* Gallery Image */}
            <div className="relative h-64 md:h-[400px] bg-gray-100 w-full group">
              {currentGalleryImage ? (
                <img src={currentGalleryImage} alt={restaurant.tenant?.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-300">
                  <BiRestaurant className="text-6xl" />
                </div>
              )}
              
              <div className="absolute top-6 left-6 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider text-orange-600 shadow-sm">
                {restaurant.summary?.available_item_count || 0} dishes Live
              </div>
              
              {shopGalleryImages.length > 1 && (
                <>
                  <button onClick={() => browseGallery(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/50 hover:bg-white backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 shadow-lg transition-all opacity-0 group-hover:opacity-100">
                    <BiChevronLeft className="text-2xl" />
                  </button>
                  <button onClick={() => browseGallery(1)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/50 hover:bg-white backdrop-blur-md rounded-full flex items-center justify-center text-gray-800 shadow-lg transition-all opacity-0 group-hover:opacity-100">
                    <BiChevronRight className="text-2xl" />
                  </button>
                  <div className="absolute bottom-6 right-6 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-white">
                    {activeGalleryIndex + 1} / {shopGalleryImages.length}
                  </div>
                </>
              )}
            </div>

            {/* Info Block */}
            <div className="p-8 md:p-10 relative">
              {/* Floating avatar/icon */}
              <div className="absolute -top-12 left-8 md:left-10 w-24 h-24 bg-white rounded-2xl shadow-xl flex items-center justify-center p-2 border border-gray-50 overflow-hidden">
                 <div className="w-full h-full bg-orange-100 rounded-xl flex items-center justify-center text-orange-500">
                   <BiRestaurant className="text-4xl" />
                 </div>
              </div>
              
              <div className="mt-14">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight leading-none mb-2">
                  {restaurant.tenant?.name}
                </h1>
                
                {restaurant.profile?.tagline && (
                  <p className="text-lg font-medium text-orange-600 mb-4">{restaurant.profile.tagline}</p>
                )}
                
                <p className="flex items-start gap-2 text-gray-500 text-sm max-w-2xl mt-4">
                  <FiMapPin className="mt-0.5 flex-shrink-0 text-orange-500" />
                  {formatAddress(restaurant.tenant?.address)}
                  {restaurant.summary?.distance_km != null && (
                    <span className="ml-2 px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-xs font-semibold">
                      {formatDistance(restaurant.summary.distance_km)}
                    </span>
                  )}
                </p>
                
                {restaurant.profile?.description && (
                  <p className="mt-6 text-gray-600 leading-relaxed text-sm max-w-3xl">
                    {restaurant.profile.description}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-6">
                  {serviceModeLabels.map((label) => (
                    <span key={label} className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.section>

          {/* Menu Sections */}
          <div className="space-y-12">
            {visibleSections.length === 0 ? (
              <div className="bg-white rounded-[32px] p-12 text-center border border-gray-100">
                 <FiInfo className="text-4xl text-gray-300 mx-auto mb-4" />
                 <h2 className="text-2xl font-bold text-gray-900 mb-2">Menu is empty</h2>
                 <p className="text-gray-500">This location has not added any live menu items yet.</p>
              </div>
            ) : (
              visibleSections.map((section, idx) => (
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={section.id} 
                  className="pt-4"
                >
                  <div className="mb-6 px-2">
                    <h2 className="text-3xl font-extrabold text-gray-900">{section.name}</h2>
                    {section.description && <p className="text-gray-500 mt-2">{section.description}</p>}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                    {section.items.map((item) => {
                      const quantity = cart[item.id] || 0;
                      return (
                        <div 
                          id={`dish-${item.id}`}
                          key={item.id}
                          className={`bg-white rounded-3xl p-4 flex gap-4 transition-all duration-300 border ${
                            String(focusedItemId) === String(item.id)
                              ? "border-orange-300 shadow-md ring-4 ring-orange-50" 
                              : "border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md"
                          }`}
                        >
                          <div className="w-28 h-28 shrink-0 rounded-2xl bg-gray-50 overflow-hidden relative border border-gray-100">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-200">
                                <BiRestaurant className="text-3xl" />
                              </div>
                            )}
                            {/* Food type dot */}
                            <div className={`absolute bottom-2 left-2 w-5 h-5 rounded flex items-center justify-center border-2 bg-white/90 backdrop-blur-md shadow-sm ${item.food_type === 'veg' ? 'border-green-500' : 'border-red-500'}`}>
                              <div className={`w-2 h-2 rounded-full ${item.food_type === 'veg' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            </div>
                          </div>

                          <div className="flex-1 flex flex-col pt-1">
                            <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{item.name}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed flex-1">
                              {item.description || "Freshly made standard portion."}
                            </p>
                            
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                              <span className="font-bold text-gray-900 text-lg">
                                {formatCurrency(item.display_price)}
                              </span>

                              {quantity > 0 ? (
                                <div className="flex items-center bg-gray-100 rounded-full p-1 shadow-inner">
                                  <button onClick={() => updateQuantity(item.id, quantity - 1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white shadow-sm text-gray-700 hover:text-red-500 transition-colors">
                                    <FiMinus />
                                  </button>
                                  <span className="w-8 text-center font-bold text-sm text-gray-900">{quantity}</span>
                                  <button onClick={() => updateQuantity(item.id, quantity + 1)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-900 text-white shadow-sm hover:bg-black transition-colors">
                                    <FiPlus />
                                  </button>
                                </div>
                              ) : (
                                <button 
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="bg-orange-50 hover:bg-orange-100 border border-orange-100 text-orange-600 px-4 py-2 rounded-full text-sm font-bold transition-colors"
                                >
                                  ADD
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.section>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Cart Sticky */}
        <div className="relative lg:self-start lg:sticky lg:top-20">
          <div className="bg-white rounded-[32px] p-6 sm:p-8 shadow-xl shadow-gray-200/40 border border-gray-100">
            <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-6">
              <div className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center">
                <FiShoppingBag className="text-xl" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-gray-900 leading-none">Your Cart</h2>
                <p className="text-gray-500 text-sm mt-1">{restaurant.tenant?.name}</p>
              </div>
            </div>

            {cartLines.length === 0 ? (
               <div className="py-8 flex flex-col items-center justify-center text-center">
                 <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-4">
                   <FiShoppingBag className="text-3xl" />
                 </div>
                 <p className="text-gray-500 font-medium">Your cart is empty</p>
                 <p className="text-gray-400 text-sm mt-1">Add items from the menu to start</p>
               </div>
            ) : (
              <div className="space-y-4">
                <AnimatePresence>
                  {cartLines.map((line) => (
                    <motion.div 
                      key={line.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-start justify-between gap-3 bg-gray-50 p-3 rounded-2xl"
                    >
                      <div className="flex-1">
                        <p className="font-bold text-gray-900 text-sm pr-2">{line.name}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          {formatCurrency(line.display_price)} × {line.quantity}
                        </p>
                      </div>
                      <div className="font-bold text-gray-900 text-sm">
                        {formatCurrency(line.total)}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {cartLines.length > 0 && (
              <div className="mt-6 border-t border-gray-100 pt-6">
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-gray-500">Subtotal</span>
                    <span className="font-bold text-gray-900">{formatCurrency(cartSubtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-bold text-gray-500">Delivery fee</span>
                    <span className="font-bold text-gray-900">{formatCurrency(deliveryFee)}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-100 pt-4">
                    <span className="font-bold text-gray-500">Total amount</span>
                    <span className="text-2xl font-extrabold text-gray-900">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                <div className="mb-6">
                  <span className="block text-sm font-bold text-gray-700 mb-2">Cooking Instructions</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="E.g. Less spicy, send cutlery..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none resize-none transition-all placeholder-gray-400"
                  />
                </div>

                <div className="space-y-3">
                  <button
                    onClick={startRazorpayPayment}
                    disabled={submitting || payingNow}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-full shadow-lg shadow-orange-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                  >
                    {payingNow ? "Processing..." : `Pay ${formatCurrency(grandTotal)} Now`}
                  </button>
                </div>
              </div>
            )}
            
            {/* Quick Contact Info */}
            <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
               <div className="bg-gray-50 rounded-2xl p-4 text-center">
                 <FiPhone className="text-gray-400 mx-auto mb-2" />
                 <p className="text-xs text-gray-900 font-semibold break-all">
                   {restaurant.profile?.reservation_phone || restaurant.tenant?.phone || "No phone"}
                 </p>
               </div>
               <div className="bg-gray-50 rounded-2xl p-4 text-center">
                 <FiMail className="text-gray-400 mx-auto mb-2" />
                 <p className="text-xs text-gray-900 font-semibold break-all">
                   {restaurant.profile?.contact_email || restaurant.tenant?.email || "No email"}
                 </p>
               </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantDetailPage;
