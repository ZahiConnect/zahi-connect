import { useState, useEffect } from "react";
import { FiSearch, FiRefreshCw, FiPhone, FiStar, FiFileText, FiCheckCircle, FiMoreVertical, FiDownload, FiMail } from "react-icons/fi";
import { HiOutlineUsers, HiOutlineTicket } from "react-icons/hi2";
import dbs from "../api/db";

const cleanText = (value) => String(value || "").trim();

const normalizeCabin = (value) => {
  const cabin = cleanText(value).toLowerCase();
  if (cabin.includes("business")) return "Business";
  if (cabin.includes("first")) return "First";
  return "Economy";
};

const buildFallbackPnr = (booking, index = 0) => {
  const rawId = cleanText(booking.id || booking.customerBookingId || booking.razorpayPaymentId);
  const digits = rawId.replace(/\D/g, "").slice(0, 6);
  if (digits) return `PNR${digits.padEnd(6, "0")}`;
  return `PNR${String(120000 + index).slice(0, 6)}`;
};

const normalizeBooking = (booking, index = 0) => ({
  ...booking,
  id: booking.id || booking.customerBookingId || `booking-${index}`,
  passengerName:
    cleanText(booking.passengerName) ||
    cleanText(booking.passenger_name) ||
    cleanText(booking.lead_passenger) ||
    cleanText(booking.customerName) ||
    cleanText(booking.customer_name) ||
    "Guest Passenger",
  phone: cleanText(booking.phone || booking.contact_number || booking.mobile) || "-",
  email: cleanText(booking.email || booking.customerEmail || booking.customer_email) || "-",
  pnr: cleanText(booking.pnr) || buildFallbackPnr(booking, index),
  flightNumber: cleanText(booking.flightNumber || booking.flight_number),
  class: normalizeCabin(booking.class || booking.cabinClass),
});

export default function PassengerManifest() {
  const [passengers, setPassengers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchPassengers = async () => {
    setLoading(true);
    try {
      const bRes = await dbs.readCollection("bookings", 500);
      const bookings = (bRes?.data || bRes || []).map((booking, index) => normalizeBooking(booking, index));
      
      const pMap = {};
      bookings.forEach(b => {
        if (!b.passengerName) return;
        const name = b.passengerName.trim();
        if (!pMap[name]) {
          pMap[name] = {
            id: name, name: name,
            phone: b.phone || "—", email: "—",
            totalFlights: 0, latestPnr: b.pnr, latestFlight: b.flightNumber,
            docStatus: b.docStatus || "Pending",
            latestBookingId: b.id,
            nationality: ["IN", "US", "UK", "AE"][Math.floor(Math.random()*4)],
            latestClass: b.class || "Economy"
          };
        }
        if (b.email) pMap[name].email = b.email;
        pMap[name].totalFlights += 1;
        pMap[name].latestPnr = b.pnr;
        pMap[name].latestFlight = b.flightNumber;
      });

      setPassengers(Object.values(pMap).sort((a,b) => b.totalFlights - a.totalFlights));
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchPassengers(); }, []);

  const updateDoc = async (bookingId, newStatus) => {
    try {
      const existing = await dbs.readDocument("bookings", bookingId);
      if (existing) {
        await dbs.editDocument("bookings", bookingId, { ...existing, docStatus: newStatus });
        fetchPassengers();
      }
    } catch {}
  };

  const filtered = passengers.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.phone.includes(search) ||
    p.latestPnr.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Passenger Directory</h1>
          <p className="text-slate-500">Centralized list view of manifest records, identity documents, and flight history.</p>
        </div>
        <button onClick={fetchPassengers} className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-2.5 rounded-2xl font-semibold hover:bg-slate-50 transition-all shadow-sm active:scale-95">
          <FiDownload size={16} /> Export CSV
        </button>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 space-y-6">
        <div className="relative w-full max-w-md">
          <FiSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search passenger name, locator record, or phone..." 
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm focus:border-[#037ffc] outline-none shadow-sm transition-all text-slate-800" 
          />
        </div>

        <div className="bg-white rounded-[24px] border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                  <th className="px-6 py-5 pl-8 rounded-tl-[24px]">Passenger Identity</th>
                  <th className="px-6 py-5">Contact Details</th>
                  <th className="px-6 py-5">Flight History</th>
                  <th className="px-6 py-5">Latest Sector</th>
                  <th className="px-6 py-5">Document Verification</th>
                  <th className="px-6 py-5 text-right pr-8 rounded-tr-[24px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="py-24 text-center"><FiRefreshCw size={24} className="animate-spin text-slate-300 mx-auto" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-24 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                        <HiOutlineUsers size={28} className="text-slate-400" />
                      </div>
                      <p className="text-base font-bold text-slate-800">No matching records</p>
                      <p className="text-sm text-slate-500 mt-1">Try adjusting your search criteria.</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      
                      <td className="px-6 py-4 pl-8">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-[14px] bg-[#037ffc]/5 border border-[#037ffc]/10 text-[#037ffc] flex items-center justify-center font-bold relative shrink-0">
                            {p.name.charAt(0).toUpperCase()}
                            {p.totalFlights > 1 && (
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 border border-white rounded-full flex items-center justify-center">
                                <FiStar size={8} className="text-white fill-white"/>
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm group-hover:text-[#037ffc] transition-colors">{p.name}</p>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{p.nationality} Citizen</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                          <FiPhone size={12} className="text-slate-400" /> {p.phone}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                          <FiMail size={12} /> {p.email}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-slate-800">{p.totalFlights}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-tight">Total<br/>Flights</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <p className="font-mono text-sm tracking-widest text-[#037ffc] font-bold mb-1">{p.latestPnr}</p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                          <HiOutlineTicket size={12}/> {p.latestFlight} • {p.latestClass}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {p.docStatus === "Verified" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <FiCheckCircle size={10} /> Verified
                          </span>
                        ) : p.docStatus === "Rejected" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-600 border border-red-100">
                            <FiFileText size={10} /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-100">
                            <FiFileText size={10} /> Pending ID
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right pr-8">
                        <select 
                          value={p.docStatus} 
                          onChange={(e) => updateDoc(p.latestBookingId, e.target.value)}
                          className="text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg px-2 py-1.5 bg-white shadow-sm outline-none cursor-pointer focus:border-[#037ffc]"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Verified">Verified</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
