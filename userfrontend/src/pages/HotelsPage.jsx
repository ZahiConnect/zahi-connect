import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FiSearch, FiCalendar, FiUsers, FiFilter, FiMapPin } from "react-icons/fi";
import { MdOutlineHotel, MdOutlineBed } from "react-icons/md";

import LocationPicker from "../components/LocationPicker";
import useCustomerLocation from "../hooks/useCustomerLocation";
import useMarketplaceHotels from "../hooks/useMarketplaceHotels";
import { formatAddress, formatCurrency, formatDateRange, formatDistance } from "../lib/format";

const HotelsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [availableOnly, setAvailableOnly] = useState(false);
  const { coordinates } = useCustomerLocation(true);
  const { hotels, loading } = useMarketplaceHotels(coordinates);

  const query = searchParams.get("query") || "";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const guests = Number(searchParams.get("guests") || "2");

  const filteredHotels = useMemo(() => {
    return hotels.filter((hotel) => {
      const haystack = [
        hotel.name,
        hotel.address || "",
        hotel.tagline || "",
        hotel.property_type || "",
        ...(hotel.room_type_labels || []),
        ...(hotel.featured_amenities || []),
      ].join(" ").toLowerCase();
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

  const updateParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value || value === 0) next.set(key, String(value));
    else next.delete(key);
    setSearchParams(next);
  };

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
          <div className="absolute -bottom-32 -right-32 w-[30rem] h-[30rem] bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
          
          <div className="z-10 w-full lg:w-3/5 flex flex-col justify-center">
            <span className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase mb-5 w-fit flex items-center gap-1.5">
              <MdOutlineHotel /> Hotels & Stays
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-sans font-extrabold text-gray-900 tracking-tight leading-[1.1] mb-8">
              Find your perfect stay
            </h1>
            
            <div className="flex flex-col sm:flex-row max-w-2xl bg-gray-50 p-2 rounded-2xl border border-gray-200 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all">
              <div className="flex-1 flex items-center px-4">
                <FiSearch className="text-gray-400 text-xl" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => updateQuery(e.target.value)}
                  placeholder="Search by name, location, or room type..."
                  className="w-full bg-transparent border-none focus:ring-0 text-gray-800 placeholder-gray-400 py-3 ml-3 outline-none"
                />
              </div>
            </div>
            
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {(checkIn || checkOut) && (
                <div className="flex items-center gap-2 bg-gray-100 px-4 py-2.5 rounded-full text-sm font-semibold text-gray-700 max-w-[220px] truncate">
                  <FiCalendar className="text-indigo-500 shrink-0" />
                  <span className="truncate">{formatDateRange(checkIn, checkOut)}</span>
                </div>
              )}

              <label className="flex items-center gap-2 bg-gray-100 px-4 py-2.5 rounded-full text-sm font-semibold text-gray-700">
                <FiUsers className="text-gray-500" />
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={guests}
                  onChange={(event) => updateParam("guests", Number(event.target.value) || 1)}
                  className="w-10 bg-transparent outline-none text-center"
                />
                Guests
              </label>

              <button
                onClick={() => setAvailableOnly(!availableOnly)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-semibold transition-colors border ${
                  availableOnly 
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md" 
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                <FiFilter className={availableOnly ? "text-indigo-200" : "text-gray-400"} />
                {availableOnly ? "Available ✓" : "Available Only"}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <LocationPicker tone="indigo" />
            </div>
          </div>

          {/* Right Side Stats Panel */}
          <div className="z-10 w-full lg:w-2/5 flex flex-col justify-end lg:items-end">
             <div className="w-full max-w-sm bg-gray-900 rounded-[28px] p-6 text-white shadow-xl shadow-gray-900/10">
               <div className="w-12 h-12 bg-gray-800 rounded-2xl flex items-center justify-center text-indigo-400 mb-6">
                 <MdOutlineHotel className="text-2xl" />
               </div>
               
               <div className="grid grid-cols-2 gap-6 relative">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-12 bg-gray-800"></div>
                 <div>
                   <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Total Properties</p>
                   <p className="text-3xl font-extrabold">{hotels.length}</p>
                 </div>
                 <div className="pl-2">
                   <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-1">Matches Found</p>
                   <p className="text-3xl font-extrabold">{filteredHotels.length}</p>
                 </div>
               </div>
             </div>
          </div>
        </div>
      </motion.section>

      {/* Results Grid */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex-1">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-[24px] h-[360px] animate-pulse border border-gray-100 shadow-sm" />
            ))}
          </div>
        ) : filteredHotels.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm flex flex-col items-center max-w-3xl mx-auto mt-10"
          >
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
               <MdOutlineBed className="text-6xl text-gray-300" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">No hotels found</h2>
            <p className="text-gray-500 mb-8 max-w-md">Try a different location, property type, or remove the availability check to see all properties.</p>
            <button onClick={() => { setAvailableOnly(false); updateQuery("") }} className="bg-gray-900 text-white px-8 py-3 rounded-full font-semibold hover:bg-black transition-colors">
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
            {filteredHotels.map((hotel) => (
              <HotelCard 
                key={hotel.id} 
                hotel={hotel} 
                guests={guests} 
                checkIn={checkIn}
                checkOut={checkOut}
              />
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
};

const HotelCard = ({ hotel, guests, checkIn, checkOut }) => {
  const isAvailable = Number(hotel.available_rooms || 0) > 0;

  return (
    <motion.article 
      variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
      className="group bg-white rounded-3xl overflow-hidden border border-gray-100 hover:border-indigo-200 hover:shadow-xl transition-all duration-300 flex flex-col hover:-translate-y-1 relative"
    >
      <Link 
        to={`/hotels/${hotel.slug}?checkIn=${encodeURIComponent(checkIn)}&checkOut=${encodeURIComponent(checkOut)}&guests=${guests}`} 
        className="block relative h-56 overflow-hidden bg-gray-100"
      >
        {hotel.cover_image || hotel.logo ? (
          <img src={hotel.cover_image || hotel.logo} alt={hotel.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MdOutlineHotel className="text-4xl text-gray-300" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/60 to-transparent"></div>
        
        {/* Availability Badge */}
        <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-sm ${
            isAvailable ? "bg-green-500/90 text-white" : "bg-black/60 text-white"
          }`}>
            {isAvailable ? `${hotel.available_rooms} rooms open` : "Fully booked"}
          </span>
        </div>
        
        {/* Property Type Badge */}
        {hotel.property_type && (
          <span className="absolute bottom-4 left-4 bg-white/20 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            {hotel.property_type}
          </span>
        )}
      </Link>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2 gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-xl text-gray-900 leading-tight truncate">
              {hotel.name}
            </h3>
            {hotel.tagline && (
              <p className="text-indigo-600 text-[10px] font-bold uppercase tracking-wide mt-1 truncate">
                {hotel.tagline}
              </p>
            )}
          </div>
          <div className="bg-indigo-50 border border-indigo-100 text-indigo-900 rounded-xl px-2 py-1 flex flex-col items-end shrink-0">
            <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-500">From</span>
            <span className="font-extrabold text-sm leading-none pt-0.5">
               {hotel.starting_price ? formatCurrency(hotel.starting_price) : "NA"}
            </span>
          </div>
        </div>

        <p className="text-gray-500 text-xs flex items-start gap-1 mt-1 mb-4">
           <FiMapPin className="mt-0.5 shrink-0" />
           <span className="line-clamp-1">{formatAddress(hotel.address)}</span>
        </p>

        {hotel.distance_km != null && (
          <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-indigo-700 border border-indigo-100 w-fit">
            <FiMapPin className="text-indigo-500" />
            {formatDistance(hotel.distance_km)}
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-gray-100 flex flex-col gap-3">
           <div className="flex items-center justify-between bg-gray-50 rounded-xl p-2.5">
             <div className="text-center flex-1 border-r border-gray-200">
               <p className="text-[10px] uppercase text-gray-400 font-bold mb-0.5 tracking-wider">Rooms</p>
               <p className="text-xs font-bold text-gray-900">{hotel.total_rooms || 0}</p>
             </div>
             <div className="text-center flex-1">
               <p className="text-[10px] uppercase text-gray-400 font-bold mb-0.5 tracking-wider">Guests</p>
               <p className="text-xs font-bold text-gray-900 flex items-center justify-center gap-1">
                 <FiUsers /> {guests}
               </p>
             </div>
           </div>
           
           {((hotel.featured_amenities || []).length > 0 || (hotel.room_type_labels || []).length > 0) && (
             <div className="flex gap-1.5 flex-wrap">
               {(hotel.featured_amenities || []).slice(0, 2).map((tag) => (
                 <span key={tag} className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-100 rounded-full px-2 py-1.5 truncate max-w-[120px]">
                   {tag}
                 </span>
               ))}
               {(hotel.room_type_labels || []).slice(0, 2).map((tag) => (
                 <span key={tag} className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-100 rounded-full px-2 py-1.5 truncate max-w-[120px]">
                   {tag}
                 </span>
               ))}
             </div>
           )}
        </div>
      </div>
    </motion.article>
  );
};

export default HotelsPage;
