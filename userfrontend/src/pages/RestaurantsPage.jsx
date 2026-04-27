import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiSearch, FiMapPin, FiClock, FiArrowRight } from "react-icons/fi";
import { BiRestaurant } from "react-icons/bi";
import { MdOutlineFoodBank } from "react-icons/md";

import LocationPicker from "../components/LocationPicker";
import useCustomerLocation from "../hooks/useCustomerLocation";
import useMarketplaceFoodItems from "../hooks/useMarketplaceFoodItems";
import { formatCurrency, formatDistance } from "../lib/format";

const RestaurantsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeFoodType, setActiveFoodType] = useState("");
  
  const { coordinates } = useCustomerLocation(true);
  const { foodItems, loading } = useMarketplaceFoodItems(coordinates);

  const query = searchParams.get("query") || "";

  const foodTypeFilters = [
    { value: "", label: "All categories" },
    { value: "veg", label: "Veg" },
    { value: "non_veg", label: "Non veg" },
  ];

  const filteredItems = useMemo(() => {
    return foodItems.filter((item) => {
      const haystack = [item.name, item.description, item.category_name, item.restaurant_name, item.restaurant_address]
        .join(" ").toLowerCase();
      const matchesSearch = haystack.includes(query.toLowerCase());
      const matchesFoodType = !activeFoodType || item.food_type === activeFoodType;
      return matchesSearch && matchesFoodType;
    });
  }, [activeFoodType, foodItems, query]);

  const representedRestaurants = useMemo(
    () => new Set(filteredItems.map((item) => item.restaurant?.id || item.restaurant_slug)).size,
    [filteredItems]
  );

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value || value === 0) next.set(key, String(value));
    else next.delete(key);
    setSearchParams(next);
  };

  const getSelectedFoodPath = (item) =>
    `/restaurants/${item.restaurant_slug}?focus=${encodeURIComponent(item.id)}&add=1`;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div className="min-h-[80vh] bg-white rounded-[32px] sm:rounded-[40px] flex flex-col pt-6 pb-20 shadow-sm border border-gray-100 overflow-hidden mb-12">
      
      {/* Hero Header */}
      <motion.section 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12"
      >
        <div className="bg-white rounded-[32px] p-8 md:p-10 lg:p-12 shadow-sm border border-gray-100 flex flex-col lg:flex-row justify-between gap-10 relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-[30rem] h-[30rem] bg-orange-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
          
          <div className="z-10 w-full lg:w-3/5 flex flex-col justify-center">
            <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase mb-5 w-fit">
              Food Delivery
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-sans font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-8">
              Craving something?
            </h1>
            
            <div className="flex flex-col sm:flex-row max-w-2xl bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:border-orange-500 focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
              <div className="flex-1 flex items-center px-4">
                <FiSearch className="text-gray-400 text-xl" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => updateParam("query", e.target.value)}
                  placeholder="Search sushi, burgers, or Joe's Cafe..."
                  className="w-full bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-400 py-3 ml-3 outline-none"
                />
              </div>
            </div>
            
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <LocationPicker tone="orange" />
            </div>
          </div>

          {/* Right Side Stats Panel */}
          <div className="z-10 w-full lg:w-2/5 flex flex-col justify-end lg:items-end">
             <div className="w-full max-w-sm bg-gray-900 rounded-[28px] p-6 text-white shadow-xl shadow-gray-900/10">
               <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-orange-400 mb-6">
                 <BiRestaurant className="text-2xl" />
               </div>
               
               <div className="grid grid-cols-2 gap-6 relative">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-12 bg-gray-800"></div>
                 <div>
                   <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Live Dishes</p>
                   <p className="text-3xl font-extrabold">{filteredItems.length}</p>
                 </div>
                 <div className="pl-2">
                   <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Restaurants</p>
                   <p className="text-3xl font-extrabold">{representedRestaurants}</p>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </motion.section>

      {/* Food Type Tabs */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 sticky top-24 z-30">
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide py-2">
          {foodTypeFilters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFoodType(filter.value)}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm ${
                activeFoodType === filter.value
                  ? "bg-gray-900 text-white shadow-md scale-105"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Grid */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-3xl h-80 animate-pulse border border-gray-100 shadow-sm" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm flex flex-col items-center max-w-3xl mx-auto mt-10"
          >
            <MdOutlineFoodBank className="text-8xl text-gray-200 mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">No bites found</h2>
            <p className="text-gray-500 mb-8 max-w-md">We couldn't find anything matching your search. Try adjusting your filters or search term.</p>
            <button onClick={() => { setActiveFoodType(""); updateParam("query", "") }} className="bg-gray-900 text-white px-8 py-3 rounded-full font-semibold hover:bg-black transition-colors">
              Clear filters
            </button>
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredItems.map((item) => (
              <motion.article 
                variants={itemVariants}
                key={item.id} 
                className="group bg-white rounded-3xl overflow-hidden border border-gray-100 hover:border-orange-200 hover:shadow-xl transition-all duration-300 flex flex-col hover:-translate-y-1 relative"
              >
                <Link to={getSelectedFoodPath(item)} className="block relative h-56 overflow-hidden">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <BiRestaurant className="text-4xl text-gray-300" />
                    </div>
                  )}
                  {/* Floating Price Badge */}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg font-bold text-gray-900 text-sm">
                    {formatCurrency(item.display_price)}
                  </div>
                  {/* Food Type Icon */}
                  <div className={`absolute top-4 left-4 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-white/90 backdrop-blur-md shadow-md ${item.food_type === 'veg' ? 'border-green-500 text-green-500' : 'border-red-500 text-red-500'}`}>
                    <div className="w-2.5 h-2.5 rounded-full bg-current"></div>
                  </div>
                </Link>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <Link
                      to={getSelectedFoodPath(item)}
                      className="font-bold text-xl text-gray-900 leading-tight pr-4 hover:text-orange-600 transition-colors"
                    >
                      {item.name}
                    </Link>
                  </div>

                  <p className="text-gray-500 text-sm line-clamp-2 mb-4 flex-1">
                    {item.description || "Freshly prepared locally."}
                  </p>

                  <div className="flex items-center gap-3 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-auto pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-1.5">
                      <FiClock className="text-orange-500 text-sm" />
                      {item.prep_time_minutes} min
                    </div>
                    {item.distance_km != null && (
                      <div className="flex items-center gap-1.5">
                        <FiMapPin className="text-orange-500 text-sm" />
                        {formatDistance(item.distance_km)}
                      </div>
                    )}
                  </div>
                  
                  <Link 
                    to={getSelectedFoodPath(item)}
                    className="mt-4 bg-gray-50 rounded-xl p-3 flex items-center justify-between group-hover:bg-orange-50 transition-colors"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-6 h-6 rounded bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                        <BiRestaurant size={14} />
                      </div>
                      <span className="text-sm font-semibold text-gray-700 truncate">{item.restaurant_name}</span>
                    </div>
                    <FiArrowRight className="text-gray-400 group-hover:text-orange-500" />
                  </Link>

                </div>
              </motion.article>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
};

export default RestaurantsPage;
