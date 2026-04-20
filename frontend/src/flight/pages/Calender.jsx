import { useState, useEffect } from "react";
import { FiRefreshCw, FiDollarSign, FiChevronLeft, FiChevronRight, FiEdit2, FiCheck, FiX } from "react-icons/fi";
import { MdFlightTakeoff } from "react-icons/md";
import dbs from "../api/db";

export default function PricingBoard() {
  const [flights, setFlights] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState(new Date());
  
  const [editCell, setEditCell] = useState(null); // { flightId, dateStr, classType, value }
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [fRes, oRes] = await Promise.all([
        dbs.readCollection("flights", 100),
        dbs.readCollection("calendar_updates", 500)
      ]);
      setFlights(fRes?.data || fRes || []);
      setOverrides(oRes?.data || oRes || []);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchAll(); }, []);

  const changeWindow = (days) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + days);
    setStartDate(d);
  };

  const getDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        dates.push({
            dateObj: d,
            dayStr: d.toLocaleDateString("en-US", { weekday: "short" }),
            numStr: d.toLocaleDateString("en-US", { day: "2-digit", month: "short" }),
            isoStr: d.toISOString().split("T")[0],
            dayIndex: d.getDay() === 0 ? 7 : d.getDay()
        });
    }
    return dates;
  };

  const dates = getDates();

  const getDayPrice = (flightId, dateStr, basePrice) => {
    const override = overrides.find(o => o.flightId === flightId && o.date === dateStr);
    return override ? override.price : basePrice;
  };

  const hasOverride = (flightId, dateStr) => {
    return overrides.some(o => o.flightId === flightId && o.date === dateStr);
  };

  const handleSave = async () => {
    if(!editCell) return;
    setSaving(true);
    try {
      const { flightId, dateStr, value } = editCell;
      const numVal = Number(value);
      
      const existing = overrides.find(o => o.flightId === flightId && o.date === dateStr);
      if (existing) {
        await dbs.editDocument("calendar_updates", existing.id, { ...existing, price: numVal });
      } else {
        await dbs.addAutoIdDocument("calendar_updates", { flightId, date: dateStr, price: numVal });
      }
      await fetchAll();
      setEditCell(null);
    } catch { alert("Failed to save."); }
    setSaving(false);
  };

  const startEdit = (flightId, dateStr, currentPrice) => {
    setEditCell({ flightId, dateStr, value: currentPrice });
  };

  return (
    <div className="max-w-[1400px] mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Dynamic Pricing Engine</h1>
          <p className="text-slate-500">Fast fare adjustments. Set daily overrides to respond to route demand.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm">
          <button onClick={() => changeWindow(-7)} className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-slate-800 rounded-xl"><FiChevronLeft size={18}/></button>
          <div className="px-6 text-sm font-bold text-slate-700 w-64 text-center">
            {dates[0].numStr} — {dates[6].numStr}
          </div>
          <button onClick={() => changeWindow(7)} className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-slate-800 rounded-xl"><FiChevronRight size={18}/></button>
        </div>
      </div>

      <div className="animate-in fade-in duration-700">
        {loading ? (
           <div className="py-20 text-center"><FiRefreshCw size={24} className="animate-spin text-slate-300 mx-auto" /></div>
        ) : flights.length === 0 ? (
          <div className="bg-white rounded-[32px] border border-slate-100 p-20 text-center shadow-sm">
            <FiDollarSign size={48} className="mx-auto text-slate-200 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Configure Routing First</h2>
            <p className="text-sm text-slate-500">Add operational flights in the Network Planning section to enable fast pricing overrides here.</p>
          </div>
        ) : (
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-5 text-[11px] font-bold text-slate-500 uppercase tracking-widest sticky left-0 z-10 bg-slate-50 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.02)]">Flight / Route</th>
                  {dates.map(d => (
                    <th key={d.isoStr} className="px-4 py-3 text-center border-l border-slate-200">
                      <p className="text-[10px] font-bold uppercase text-slate-400 mb-0.5">{d.dayStr}</p>
                      <p className="text-sm font-bold text-slate-800">{d.numStr}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flights.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 sticky left-0 z-10 bg-white border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.01)] group-hover:bg-slate-50/50">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-[#037ffc]/5 border border-[#037ffc]/10 text-[#037ffc] flex items-center justify-center shrink-0">
                           <MdFlightTakeoff size={18} />
                         </div>
                         <div>
                            <p className="font-bold text-slate-800 text-base">{f.flightNumber}</p>
                            <p className="text-xs font-bold text-slate-400 mt-0.5">{f.from} → {f.to}</p>
                         </div>
                      </div>
                      <div className="text-[10px] font-bold uppercase text-slate-400 mt-4 tracking-widest">Base Econ fare: ₹{f.economyPrice}</div>
                    </td>
                    
                    {dates.map(date => {
                      const isOperating = (f.daysOfWeek || []).includes(date.dayIndex);
                      const isEditing = editCell?.flightId === f.id && editCell?.dateStr === date.isoStr;
                      const displayPrice = getDayPrice(f.id, date.isoStr, f.economyPrice);
                      const overridden = hasOverride(f.id, date.isoStr);

                      return (
                        <td key={date.isoStr} className={`border-l border-slate-100 p-2 ${!isOperating && "bg-slate-50/50"}`}>
                          {!isOperating ? (
                             <div className="h-full w-full py-6 flex items-center justify-center">
                                <span className="text-[10px] uppercase font-bold text-slate-300 tracking-widest">No Flight</span>
                             </div>
                          ) : isEditing ? (
                             <div className="flex flex-col gap-2 p-2">
                               <input 
                                 type="number"
                                 autoFocus
                                 className="w-full rounded-xl border border-[#037ffc] bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none shadow-[0_0_0_3px_rgba(3,127,252,0.1)]"
                                 value={editCell.value}
                                 onChange={e => setEditCell({...editCell, value: e.target.value})}
                               />
                               <div className="flex items-center gap-2">
                                 <button onClick={handleSave} disabled={saving} className="flex-1 bg-[#037ffc] hover:bg-[#0269d4] text-white rounded-lg py-1.5 flex justify-center items-center"><FiCheck size={14}/></button>
                                 <button onClick={() => setEditCell(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg py-1.5 flex justify-center items-center"><FiX size={14}/></button>
                               </div>
                             </div>
                          ) : (
                            <div 
                              onClick={() => startEdit(f.id, date.isoStr, displayPrice)}
                              className={`group cursor-pointer rounded-2xl border p-4 text-center transition-all duration-300
                                ${overridden ? 'border-amber-200 bg-amber-50 hover:border-amber-300' : 'border-slate-100 bg-white hover:border-blue-200 hover:shadow-sm'}`}
                            >
                               <p className={`text-lg font-bold ${overridden ? 'text-amber-700' : 'text-slate-800 group-hover:text-[#037ffc]'}`}>
                                 ₹{displayPrice}
                               </p>
                               <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                                 <FiEdit2 size={10}/> Edit
                               </p>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
