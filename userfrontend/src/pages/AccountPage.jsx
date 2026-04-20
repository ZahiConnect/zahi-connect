import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiShield, 
  FiMapPin, 
  FiClock, 
  FiCalendar,
  FiActivity,
  FiBriefcase,
  FiArrowRight,
  FiCheckCircle,
  FiZap,
  FiAlertCircle
} from "react-icons/fi";
import { 
  MdOutlineHotel, 
  MdOutlineRestaurant, 
  MdOutlineLocalTaxi, 
  MdOutlineFlight 
} from "react-icons/md";

import { useAuth } from "../context/AuthContext";
import {
  formatCurrency,
  formatDateRange,
  formatServiceLabel,
  formatShortDate,
} from "../lib/format";
import bookingService from "../services/bookingService";

/* ── Helpers ───────────────────────────────────────────── */

const getServiceIcon = (type) => {
  switch (type) {
    case "hotel": return <MdOutlineHotel className="text-xl" />;
    case "restaurant": return <MdOutlineRestaurant className="text-xl" />;
    case "cab": return <MdOutlineLocalTaxi className="text-xl" />;
    case "flight": return <MdOutlineFlight className="text-xl" />;
    default: return <FiActivity className="text-xl" />;
  }
};

const getStatusStyles = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("confirm") || s.includes("paid") || s.includes("success")) {
    return "bg-green-50 text-green-600 border-green-100";
  }
  if (s.includes("pending") || s.includes("wait")) {
    return "bg-orange-50 text-orange-600 border-orange-100";
  }
  if (s.includes("cancel") || s.includes("fail")) {
    return "bg-red-50 text-red-600 border-red-100";
  }
  return "bg-gray-50 text-gray-600 border-gray-100";
};

const extractDateLabel = (request) => {
  const metadata = request.metadata || {};
  if (request.service_type === "hotel") {
    return formatDateRange(metadata.check_in, metadata.check_out);
  }
  if (request.service_type === "restaurant") {
    return `${metadata.diners || 1} diner(s)`;
  }
  if (request.service_type === "cab") {
    return formatShortDate(metadata.travel_date);
  }
  if (request.service_type === "flight") {
    return formatShortDate(metadata.date || metadata.depart_date);
  }
  return "Request saved";
};

const extractMetaLine = (request) => {
  const metadata = request.metadata || {};
  if (request.service_type === "hotel") {
    return `${metadata.guests || 1} guest(s) • ${metadata.preferred_room_type || metadata.room_type || "Any room type"}`;
  }
  if (request.service_type === "restaurant") {
    return `${metadata.items?.length || 0} line item(s) • ${metadata.diners || 1} diner(s)`;
  }
  if (request.service_type === "cab") {
    return `${metadata.pickup || "Pickup"} → ${metadata.drop || "Drop"}`;
  }
  if (request.service_type === "flight") {
    const from = metadata.origin || metadata.from || "Origin";
    const to = metadata.destination || metadata.to || "Destination";
    return `${from} → ${to}`;
  }
  return request.summary || "Request captured";
};

/* ════════════════════════════════════════════════════════ */

const AccountPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const data = await bookingService.getRequests();
        if (active) setRequests(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load booking requests", error);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const groupedRequests = useMemo(() => {
    return requests.reduce((grouped, request) => {
      const key = request.service_type;
      grouped[key] = grouped[key] || [];
      grouped[key].push(request);
      return grouped;
    }, {});
  }, [requests]);

  const initials = useMemo(() => (user?.username || user?.email || "Z").slice(0, 2).toUpperCase(), [user]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-[80vh] bg-white rounded-[32px] sm:rounded-[40px] shadow-sm border border-gray-100 overflow-hidden mb-12 flex flex-col pt-6 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
      
      {/* Header Panel */}
      <motion.section 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 bg-gray-900 rounded-[32px] p-8 md:p-12 text-white relative overflow-hidden shadow-2xl"
      >
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <FiActivity className="text-[200px]" />
        </div>
        
        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-[0.2em] uppercase mb-6">
            <FiUser /> Secure Profile
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            Welcome back, <span className="text-indigo-400">{user?.username || "Traveler"}</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed max-w-2xl">
            Manage your global travel identity, track your confirmed bookings, and oversee your workspace permissions all from one dashboard.
          </p>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-10 items-start">
        
        {/* Left Sidebar: Profile Details */}
        <aside className="space-y-6 lg:sticky lg:top-24">
          <div className="bg-gray-50 border border-gray-100 rounded-[32px] p-8">
            <div className="flex flex-col items-center text-center mb-8">
              <div className="w-24 h-24 bg-indigo-100 border-4 border-white text-indigo-700 rounded-3xl flex items-center justify-center text-3xl font-black shadow-xl mb-4">
                {initials}
              </div>
              <h2 className="text-xl font-black text-gray-900">{user?.username || "Guest User"}</h2>
              <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mt-1">Zahi Cloud Identity</p>
            </div>

            <div className="space-y-3">
               {[
                 { label: "Email Address", value: user?.email, icon: FiMail },
                 { label: "Phone Number", value: user?.mobile || "Not Linked", icon: FiPhone },
                 { label: "Account Role", value: user?.role || "Customer", icon: FiShield },
               ].map(({ label, value, icon: Icon }) => (
                 <div key={label} className="bg-white border border-gray-100 rounded-2xl p-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon className="text-indigo-500 text-xs" />
                      <span className="text-[9px] uppercase tracking-[0.15em] font-bold text-gray-400">{label}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 truncate">{value || "—"}</p>
                 </div>
               ))}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
               <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <FiZap className="text-indigo-600" />
                  <div className="text-left">
                    <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-0.5">Quick Stat</p>
                    <p className="text-sm font-black text-indigo-900">{requests.length} Travel Requests</p>
                  </div>
               </div>
            </div>
          </div>

          {/* Workspace Visibility */}
          <div className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center text-white">
                <FiBriefcase />
              </div>
              <h3 className="font-extrabold text-gray-900">Workspaces</h3>
            </div>
            
            <div className="space-y-3">
              {user?.workspaces?.length ? (
                user.workspaces.map((workspace) => (
                  <div key={workspace.tenant_id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white hover:border-indigo-200 hover:shadow-lg transition-all">
                    <p className="font-bold text-gray-900 group-hover:text-indigo-600 truncate">{workspace.tenant_name || "Unnamed workspace"}</p>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-gray-400 mt-1">
                      {workspace.business_type || "Marketplace"} · {workspace.role}
                    </p>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-xs font-medium text-gray-400 leading-relaxed text-center">
                  Pure customer profile. No business workspaces attached yet.
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Right Side: Activity List */}
        <main>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <FiActivity className="text-xl" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-indigo-600 font-bold mb-0.5">Activity Stream</p>
                <h3 className="text-2xl font-extrabold text-gray-900">My Travel Activity</h3>
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-28 bg-gray-50 rounded-3xl animate-pulse border border-gray-100" />
                ))}
              </motion.div>
            ) : requests.length === 0 ? (
              <motion.div key="empty" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="py-20 text-center bg-gray-50 rounded-[32px] border border-dashed border-gray-200">
                <FiBriefcase className="text-5xl text-gray-200 mx-auto mb-6" />
                <h4 className="text-xl font-bold text-gray-800 mb-2">No active journeys found</h4>
                <p className="text-gray-500 max-w-sm mx-auto mb-8 px-6 text-sm">
                  Start by exploring our high-end marketplace for hotels, restaurants, or flight network.
                </p>
                <button 
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} 
                  className="bg-gray-900 text-white rounded-full px-6 py-3 text-sm font-bold shadow-lg active:scale-95 transition-all"
                >
                  Start Exploring
                </button>
              </motion.div>
            ) : (
              <motion.div 
                key="list"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-10"
              >
                {Object.entries(groupedRequests).map(([serviceType, items]) => (
                  <div key={serviceType} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-300">
                        {formatServiceLabel(serviceType)}
                      </span>
                      <span className="bg-gray-100 px-3 py-1 rounded-full text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                        {items.length} items
                      </span>
                    </div>

                    <div className="grid gap-4">
                      {items.map((request) => (
                        <motion.div
                          key={request.id}
                          variants={itemVariants}
                          className="bg-white border border-gray-100 rounded-[28px] p-6 lg:p-7 hover:shadow-2xl hover:shadow-gray-900/5 transition-all duration-300 relative overflow-hidden group"
                        >
                          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                             <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${getStatusStyles(request.status)}`}>
                               {getServiceIcon(request.service_type)}
                             </div>

                             <div className="flex-1 min-w-0">
                               <div className="flex flex-wrap items-center gap-3 mb-2">
                                 <h5 className="text-lg font-extrabold text-gray-900 truncate">{request.title}</h5>
                                 <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(request.status)}`}>
                                   {request.status || "Pending"}
                                 </span>
                               </div>
                               
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                                    <FiClock className="text-gray-400" />
                                    <span>{extractDateLabel(request)}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-500">
                                    <FiCheckCircle className="text-gray-400" />
                                    <span className="truncate">{extractMetaLine(request)}</span>
                                  </div>
                               </div>

                               {(request.metadata?.payment?.provider === "razorpay" || request.total_amount > 0) && (
                                 <div className="flex items-center gap-1.5 mt-3 text-[10px] font-bold text-indigo-600 uppercase tracking-widest">
                                   <FaCreditCard /> Integrated Payment Confirmed
                                 </div>
                               )}
                             </div>

                             <div className="w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-gray-100 md:pl-8 flex md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                                <div className="text-left md:text-right">
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Booking Amount</p>
                                  <p className="text-xl font-black text-gray-900">
                                    {request.total_amount ? formatCurrency(request.total_amount) : "Reserved"}
                                  </p>
                                </div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                  {formatShortDate(request.created_at)}
                                </p>
                             </div>
                          </div>

                          <div className="absolute top-4 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                             <FiArrowRight className="text-gray-300" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

export default AccountPage;
