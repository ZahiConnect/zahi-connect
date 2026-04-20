import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiArrowRight,
  FiMapPin,
  FiUsers,
  FiSearch,
  FiClock,
  FiZap,
  FiTrendingUp,
  FiCheckCircle,
  FiActivity
} from "react-icons/fi";
import { 
  MdOutlineRestaurant, 
  MdOutlineLocalTaxi, 
  MdOutlineFlight,
  MdOutlineHotel,
  MdOutlineStorefront
} from "react-icons/md";
import { FaGlobeAmericas, FaAward } from "react-icons/fa";

import { useAuth } from "../context/AuthContext";
import useCustomerLocation from "../hooks/useCustomerLocation";
import { formatAddress, formatCurrency, formatDistance, shortText } from "../lib/format";
import marketplaceService from "../services/marketplaceService";

/* ── Helpers ───────────────────────────────────────────── */

const serviceTabs = [
  { key: "restaurants", label: "Food", icon: MdOutlineRestaurant, color: "text-orange-500", bg: "bg-orange-50" },
  { key: "hotels", label: "Hotels", icon: MdOutlineHotel, color: "text-indigo-500", bg: "bg-indigo-50" },
  { key: "cabs", label: "Cabs", icon: MdOutlineLocalTaxi, color: "text-amber-600", bg: "bg-amber-50" },
  { key: "flights", label: "Flights", icon: MdOutlineFlight, color: "text-sky-500", bg: "bg-sky-50" },
];

const SectionHeader = ({ eyebrow, title, body, to, cta }) => (
  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
    <div className="max-w-2xl">
      <p className="text-[10px] uppercase tracking-[0.25em] text-orange-600 font-black mb-2">{eyebrow}</p>
      <h2 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-4">{title}</h2>
      <p className="text-gray-500 font-medium leading-relaxed">{body}</p>
    </div>
    {to && cta && (
      <Link
        to={to}
        className="group inline-flex items-center gap-2 bg-white border border-gray-100 px-6 py-3 rounded-full text-sm font-bold text-gray-900 shadow-sm hover:shadow-lg hover:border-gray-200 transition-all active:scale-95"
      >
        {cta}
        <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
      </Link>
    )}
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
          coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : undefined
        );
        if (active) setFoodItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load home data", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [coordinateKey]);

  const representedRestaurants = useMemo(
    () => new Set(foodItems.map((item) => item.restaurant?.id || item.restaurant_slug)).size,
    [foodItems]
  );

  const heroStats = useMemo(
    () => [
      { label: "Live Dishes", value: foodItems.length, icon: MdOutlineRestaurant, color: "text-orange-500" },
      { label: "Outlets", value: representedRestaurants, icon: MdOutlineStorefront, color: "text-indigo-500" },
      { label: "Connected", value: "Verified", icon: FiCheckCircle, color: "text-green-500" },
    ],
    [foodItems.length, representedRestaurants]
  );

  const spotlightItems = foodItems.slice(0, 4);

  const handleHeroSubmit = (event) => {
    event.preventDefault();
    if (activeTab === "restaurants") {
      const params = new URLSearchParams({ query: foodSearch.query, diners: String(foodSearch.diners) });
      navigate(`/restaurants?${params.toString()}`);
    } else {
      navigate(`/${activeTab}`);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-[80vh] bg-white rounded-[32px] sm:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden mb-12 flex flex-col pt-6 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
      
      {/* Hero Header Area */}
      <motion.section 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-16"
      >
        <div className="bg-gray-900 rounded-[32px] overflow-hidden relative shadow-2xl">
           <div className="absolute top-0 right-0 p-24 opacity-10 pointer-events-none">
             <FaGlobeAmericas className="text-[300px]" />
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="p-8 md:p-14 lg:p-16 text-white relative z-10">
                <span className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-400 border border-orange-500/20 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[0.25em] uppercase mb-8">
                  <FiTrendingUp /> Premier Connect Network
                </span>
                <h1 className="text-4xl md:text-5xl lg:text-7xl font-black tracking-tight leading-[1.05] mb-8">
                  The ultimate <span className="text-orange-400">lifestyle</span> network.
                </h1>
                <p className="text-gray-400 text-lg md:text-xl leading-relaxed max-w-2xl mb-12 font-medium">
                  Experience seamless connectivity across top restaurants, luxury stays, on-demand mobility, and global flights. Everything you need, unified.
                </p>

                {/* Service Tab Switcher */}
                <div className="flex flex-wrap gap-2 mb-8">
                  {serviceTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`inline-flex items-center gap-2.5 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-300 ${
                          isActive 
                            ? "bg-white text-gray-900 shadow-xl scale-105" 
                            : "bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}
                      >
                        <Icon className={isActive ? tab.color : ""} />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <form onSubmit={handleHeroSubmit} className="bg-white p-3 rounded-3xl flex flex-col md:flex-row gap-3 shadow-2xl shadow-black/20">
                   <div className="flex-1 flex items-center px-4 bg-gray-50 rounded-2xl border border-gray-100 focus-within:border-orange-500 transition-colors">
                      <FiSearch className="text-gray-400 text-xl" />
                      <input 
                         type="text" 
                         value={foodSearch.query}
                         onChange={e => setFoodSearch(c => ({...c, query: e.target.value}))}
                         placeholder={`Search for ${activeTab === 'restaurants' ? 'dishes or cuisines' : 'available services'}...`}
                         className="w-full bg-transparent border-none py-4 px-3 text-gray-800 placeholder-gray-400 outline-none text-sm font-bold"
                      />
                   </div>
                   <button 
                     type="submit"
                     className="bg-gray-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                   >
                     Continue <FiArrowRight />
                   </button>
                </form>
              </div>

              {/* Stats Panel (Right Side Desktop) */}
              <div className="hidden lg:flex flex-col justify-center p-12 bg-white/5 border-l border-white/5 space-y-10 mt-auto mb-auto h-full">
                 {heroStats.map((stat, i) => (
                   <div key={i} className="flex gap-5 items-center">
                      <div className={`w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-xl ${stat.color}`}>
                        <stat.icon />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">{stat.label}</p>
                        <p className="text-3xl font-black text-white leading-none">{stat.value}</p>
                      </div>
                   </div>
                 ))}
                 
                 <div className="pt-8 border-t border-white/5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                       <FaAward />
                    </div>
                    <div>
                       <p className="text-xs font-black text-orange-400 uppercase tracking-widest">Global Standard</p>
                       <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Zahi Connect Protocol v2.4</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </motion.section>

      {/* Nearby Badge & Call to Action */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-20 bg-gray-50 p-6 rounded-[32px] border border-gray-100">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
               <FiMapPin className="text-xl" />
            </div>
            <div>
               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Location</p>
               <h3 className="font-bold text-gray-900">{locationLabel || "Seeking Location..."}</h3>
            </div>
         </div>
         <div className="flex gap-4">
            {!coordinates && (
              <button 
                onClick={requestLocation}
                className="bg-indigo-600 text-white px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest active:scale-95 transition-all shadow-lg shadow-indigo-600/20"
              >
                Enable nearby results
              </button>
            )}
            <Link to="/account" className="bg-white border border-gray-200 px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest hover:border-gray-300 transition-all shadow-sm">
               My Activity Hub
            </Link>
         </div>
      </div>

      {/* Featured Grid */}
      <section className="mb-20">
        <SectionHeader 
           eyebrow="Network Spotlight"
           title="Discover curated experiences."
           body="Explore popular listings across the Zahi network, ranked by proximity and real-time availability."
           to="/restaurants"
           cta="View All Food"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {loading ? (
             [...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-50 rounded-3xl animate-pulse border border-gray-100" />)
           ) : (
             spotlightItems.map((item) => (
               <Link 
                 key={item.id} 
                 to={`/restaurants/${item.restaurant_slug}?focus=${item.id}`}
                 className="group relative bg-white border border-gray-100 rounded-[32px] overflow-hidden hover:shadow-2xl transition-all duration-500"
               >
                 <div className="h-48 overflow-hidden bg-gray-100">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200"><MdOutlineRestaurant className="text-4xl" /></div>
                    )}
                 </div>
                 <div className="p-6">
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-orange-100">
                        {item.category_name || "Food"}
                      </span>
                      <p className="text-sm font-black text-gray-900">{formatCurrency(item.display_price)}</p>
                    </div>
                    <h4 className="font-extrabold text-gray-900 group-hover:text-orange-600 transition-colors truncate mb-1">{item.name}</h4>
                    <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-widest">
                       <MdOutlineStorefront className="text-indigo-400" /> {item.restaurant_name}
                    </p>
                 </div>
               </Link>
             ))
           )}
        </div>
      </section>

      {/* Service Promo Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
         {[
           { 
             title: "The Mobility Hub", 
             body: "Real-time cab lane. Online drivers, direct contact, and instant match-making.", 
             to: "/cabs", 
             cta: "Book a Cab",
             icon: MdOutlineLocalTaxi,
             theme: "bg-amber-600",
             bg: "bg-amber-50"
           },
           { 
             title: "Aviation Network", 
             body: "Direct flight bookings staged with major operators. Instant confirmed schedules.", 
             to: "/flights", 
             cta: "Check Flights",
             icon: MdOutlineFlight,
             theme: "bg-sky-600",
             bg: "bg-sky-50"
           }
         ].map((card, i) => (
           <div key={i} className={`p-8 md:p-10 rounded-[36px] border border-gray-100 relative overflow-hidden group hover:shadow-2xl transition-all duration-500 ${card.bg}`}>
              <div className="absolute -bottom-10 -right-10 opacity-5 group-hover:opacity-10 transition-opacity">
                 <card.icon className="text-[180px]" />
              </div>
              <div className="relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg mb-6 ${card.theme}`}>
                   <card.icon className="text-2xl" />
                </div>
                <h3 className="text-3xl font-black text-gray-900 mb-4">{card.title}</h3>
                <p className="text-gray-500 font-medium leading-relaxed max-w-sm mb-8">{card.body}</p>
                <Link to={card.to} className="inline-flex items-center gap-2 bg-gray-900 text-white rounded-full px-8 py-4 font-black text-xs uppercase tracking-widest shadow-xl shadow-black/10 active:scale-95 transition-all">
                   {card.cta} <FiArrowRight />
                </Link>
              </div>
           </div>
         ))}
      </section>

      {/* Feature Pills */}
      <section className="flex flex-wrap items-center justify-center gap-3">
         {[
           "Dish-first Discovery",
           "Unified Multi-module Search",
           "Secure Razorpay integration",
           "Real-time Mobility Network",
           "Premium Global Experience",
           "Automated Proximity Hub"
         ].map((pill, i) => (
           <div key={i} className="px-6 py-3 rounded-full border border-gray-100 bg-white text-[10px] font-black text-gray-400 uppercase tracking-widest shadow-sm">
             {pill}
           </div>
         ))}
      </section>

    </div>
  );
};

export default HomePage;
