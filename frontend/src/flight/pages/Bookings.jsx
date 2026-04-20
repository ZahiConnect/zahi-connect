import { useState, useEffect } from "react";
import { 
  FiSearch, FiPlus, FiTrash2, FiEdit3, FiX, FiRefreshCw, FiChevronDown, FiUser
} from "react-icons/fi";
import { MdFlightTakeoff } from "react-icons/md";
import { HiOutlineTicket } from "react-icons/hi2";
import dbs from "../api/db";

const STATUSES = [
  { value: "Confirmed", label: "Confirmed", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  { value: "Checked-In", label: "Checked-In", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  { value: "Boarded", label: "Boarded", bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
  { value: "Cancelled", label: "Cancelled", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
];

const Btn = ({ children, onClick, disabled, variant = "primary" }) => {
  const base = "inline-flex items-center justify-center rounded-2xl font-medium transition-all duration-300 active:scale-[0.98] disabled:opacity-50 px-5 py-2.5 text-sm gap-2";
  if (variant === "primary") return <button onClick={onClick} disabled={disabled} className={`${base} bg-slate-900 text-white hover:bg-slate-800 shadow-sm`}>{children}</button>;
  if (variant === "ghost") return <button onClick={onClick} disabled={disabled} className={`${base} bg-slate-50 text-slate-600 hover:bg-slate-100`}>{children}</button>;
};

const Input = ({ label, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest block">{label}</label>
    <input className="w-full rounded-2xl border border-slate-200 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-800 transition-all placeholder:text-slate-300" {...props} />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest block">{label}</label>
    <div className="relative">
      <select className="appearance-none w-full rounded-2xl shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-slate-800 transition-all" {...props}>
        {options.map(o => <option key={o.value||o} value={o.value||o}>{o.label||o}</option>)}
      </select>
      <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  </div>
);

const CabinMap = ({ cabin, travellers, selected = [], onChange }) => {
  const [layout, setLayout] = useState({ rows: [], cols: [] });
  useEffect(() => {
    let numRows = 4, cols = ["A","B"];
    if (cabin === "Economy") { numRows = 6; cols = ["A","B","C","D","E","F"]; }
    else if (cabin === "Business") { numRows = 4; cols = ["A","B","C","D"]; }
    else if (cabin === "First") { numRows = 2; cols = ["A","B"]; }
    
    let rs = [];
    for(let r=1; r<=numRows; r++) rs.push(r);
    setLayout({ rows: rs, cols });
  }, [cabin, travellers]);

  const toggle = s => {
    if (selected.includes(s)) onChange(selected.filter(x => x !== s));
    else {
      if (selected.length < travellers) onChange([...selected, s]);
      else {
        const newSel = [...selected];
        newSel.shift(); newSel.push(s);
        onChange(newSel);
      }
    }
  };

  return (
    <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-[20px] col-span-1 md:col-span-2 mt-2 group">
       <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest text-center mb-6">Interactive Seat Selector ({cabin})</p>
       <div className="flex flex-col gap-3 justify-center items-center mx-auto">
         {layout.rows.map(r => (
           <div key={r} className="flex items-center gap-2.5">
             {layout.cols.map(c => {
               const s = `${r}${c}`;
               const isSel = selected.includes(s);
               const isAisle = (cabin==="Economy" && c==="C") || (cabin==="Business" && c==="B") || (cabin==="First" && c==="A");
               return (
                 <div key={s} className={`${isAisle ? "mr-6" : ""}`}>
                   <button 
                     onClick={() => toggle(s)} 
                     className={`w-9 h-11 rounded-t-xl rounded-b-md text-[10px] font-bold flex items-center justify-center transition-all ${isSel ? 'bg-[#037ffc] text-white shadow-md shadow-[#037ffc]/20' : 'bg-white border-2 border-slate-200 text-slate-500 hover:border-[#037ffc]/50'}`}
                   >
                     {s}
                   </button>
                 </div>
               )
             })}
           </div>
         ))}
       </div>
       <p className="text-xs text-center font-bold text-slate-500 mt-6">
         {selected.length === 0 ? `Required: Select ${travellers} seat(s)` : `Allocated: ${selected.join(", ")}`}
       </p>
    </div>
  )
};

const BookingModal = ({ open, existing, onClose, onSave, flights }) => {
  const [b, setB] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setB(existing ? { ...existing } : {
        pnr: "PNR" + Math.floor(100000 + Math.random() * 900000), 
        passengerName: "", phone: "", flightNumber: flights[0]?.flightNumber || "", 
        date: new Date().toISOString().split('T')[0],
        travellers: 1, class: "Economy", status: "Confirmed", seats: []
      });
    }
  }, [open, existing, flights]);

  if (!open) return null;

  const save = async () => {
    if (!b.passengerName || !b.flightNumber) return;
    setSaving(true);
    try {
      if (existing) await dbs.editDocument("bookings", existing.id, b);
      else await dbs.addAutoIdDocument("bookings", b);
      onSave();
    } catch {}
    setSaving(false);
  };

  const fOpts = [{value: "", label: "Select flight" }, ...flights.map(f => ({ value: f.flightNumber, label: `${f.flightNumber} (${f.from}-${f.to})` }))];
  const cOpts = ["Economy", "Business", "First"];
  const sOpts = STATUSES.filter(s => s.value !== "Boarded").map(s => ({ value: s.value, label: s.label }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl flex flex-col max-h-[95vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
        
        <div className="p-8 overflow-y-auto flex-1 space-y-8 custom-scrollbar">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-800">{existing ? "Modify Reservation" : "New Reservation"}</h3>
            <button onClick={onClose} className="w-10 h-10 bg-slate-50 hover:bg-slate-100 flex items-center justify-center rounded-full text-slate-500 transition"><FiX size={20}/></button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Record Locator (PNR)" value={b.pnr} readOnly />
            <Select label="Routing Identifier" options={fOpts} value={b.flightNumber} onChange={e => setB({ ...b, flightNumber: e.target.value })} />
            <Input label="Lead Passenger" value={b.passengerName} onChange={e => setB({ ...b, passengerName: e.target.value })} placeholder="John Doe" />
            <Input label="Contact Number" value={b.phone} onChange={e => setB({ ...b, phone: e.target.value })} placeholder="+1..." />
            <Input label="Departure Date" type="date" value={b.date} onChange={e => setB({ ...b, date: e.target.value })} />
            <div className="flex gap-4">
              <div className="flex-1">
                <Input label="Travellers" type="number" min={1} value={b.travellers || 1} onChange={e => setB({ ...b, travellers: e.target.value, seats: [] })} />
              </div>
              <div className="flex-[2]">
                <Select label="Cabin" options={cOpts} value={b.class || "Economy"} onChange={e => setB({ ...b, class: e.target.value, seats: [] })} />
              </div>
            </div>
            
            <CabinMap cabin={b.class} travellers={b.travellers} selected={b.seats || []} onChange={s => setB({ ...b, seats: s })} />
          </div>
          
          <div className="pt-2">
            <Select label="Clearance Status" options={sOpts} value={b.status} onChange={e => setB({ ...b, status: e.target.value })} />
          </div>
        </div>
        
        <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-white shrink-0">
          <Btn variant="ghost" onClick={onClose}>Discard</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "Saving..." : "Confirm Booking"}</Btn>
        </div>
        
      </div>
    </div>
  );
};

export default function Bookings() {
  const [bookings, setBookings] = useState([]);
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modOpen, setModOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [bRes, fRes] = await Promise.all([
        dbs.readCollection("bookings", 100),
        dbs.readCollection("flights", 100)
      ]);
      setBookings(bRes?.data || bRes || []);
      setFlights(fRes?.data || fRes || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const del = async id => {
    if (!window.confirm("Delete this PNR permanently?")) return;
    await dbs.deleteDocument("bookings", id);
    fetchAll();
  };

  const filtered = bookings.filter(b => 
    (b.passengerName||"").toLowerCase().includes(search.toLowerCase()) || 
    (b.pnr||"").toLowerCase().includes(search.toLowerCase()) ||
    (b.flightNumber||"").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-0">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Active Clearances</h1>
          <p className="text-slate-500">Monitor passenger records, issue tickets, and handle boarding states.</p>
        </div>
        <Btn onClick={() => { setEditing(null); setModOpen(true); }}><FiPlus size={16}/> New Booking</Btn>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-700 space-y-6">
        <div className="relative w-full max-w-md">
          <FiSearch size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search Record Locator, Pax, or Route..." 
            className="w-full rounded-2xl border border-slate-200 bg-white py-3.5 pl-11 pr-4 text-sm focus:border-slate-800 outline-none shadow-sm transition-all text-slate-800" 
          />
        </div>

        <div className="bg-white rounded-[24px] overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-8">Passenger</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Locator</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Route Data</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cabin & Seats</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><FiRefreshCw size={24} className="animate-spin text-slate-300 mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-slate-100">
                      <HiOutlineTicket size={24} className="text-slate-400" />
                    </div>
                    <p className="text-base font-bold text-slate-800">No records found</p>
                    <p className="text-sm text-slate-500 mt-1">Adjust search parameters or issue a new ticket.</p>
                  </td>
                </tr>
              ) : (
                filtered.map(b => {
                  const stat = STATUSES.find(s => s.value === b.status) || STATUSES[0];
                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 pl-8">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-sm">{b.passengerName?.charAt(0)}</div>
                          <span className="font-semibold text-slate-800">{b.passengerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm tracking-widest text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded-md">{b.pnr}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{b.flightNumber}</span>
                          <span className="text-xs text-slate-400 font-medium">• {b.date}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-semibold text-slate-700">{b.class}</p>
                        <p className="text-[10px] uppercase font-bold text-[#037ffc] tracking-widest mt-0.5 whitespace-nowrap">{(b.seats || []).length > 0 ? (b.seats||[]).join(", ") : "UNASSIGNED"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${stat.bg} ${stat.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${stat.dot}`} />
                          {stat.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right pr-6">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => { setEditing(b); setModOpen(true); }} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"><FiEdit3 size={15} /></button>
                          <button onClick={() => del(b.id)} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"><FiTrash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <BookingModal 
        open={modOpen} existing={editing} flights={flights}
        onClose={() => setModOpen(false)} 
        onSave={() => { setModOpen(false); fetchAll(); }}
      />
    </div>
  );
}
