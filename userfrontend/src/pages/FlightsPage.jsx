import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, PlaneTakeoff, PlaneLanding, Users, CalendarDays, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import { todayDate, formatCurrency } from "../lib/format";
import marketplaceService from "../services/marketplaceService";
import bookingService from "../services/bookingService";

const FlightsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [airlines, setAirlines] = useState([]);
  const [allFlights, setAllFlights] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [form, setForm] = useState({
    from: "",
    to: "",
    departDate: todayDate(),
    travellers: 1,
    flightClass: "economy",
  });

  const [hasSearched, setHasSearched] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [bookingFlight, setBookingFlight] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchFlights = async () => {
      setLoading(true);
      try {
        const tenantSummaries = await marketplaceService.getFlights();
        setAirlines(tenantSummaries || []);
        
        // Aggregate all flights from all airlines for search
        const detailsPromises = (tenantSummaries || []).map(t => marketplaceService.getFlight(t.slug));
        const details = await Promise.all(detailsPromises);
        
        let aggregated = [];
        details.forEach(d => {
          if (d.flights) {
            const airlineInfo = {
              name: d.settings.display_name,
              logo: d.settings.logo,
              slug: d.tenant.slug,
              id: d.tenant.id
            };
            d.flights.forEach(f => {
              aggregated.push({ ...f, airline: airlineInfo });
            });
          }
        });
        setAllFlights(aggregated);
      } catch (err) {
        console.error("Failed to load flights", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFlights();
  }, []);

  const setField = (field, value) => setForm(c => ({ ...c, [field]: value }));

  const searchFlights = () => {
    if (!form.from || !form.to) {
      toast.error("Please enter both source and destination cities.");
      return;
    }
    const fromQuery = form.from.toLowerCase();
    const toQuery = form.to.toLowerCase();
    
    // Simple substring match for cities
    const results = allFlights.filter(f => 
      f.from_city.toLowerCase().includes(fromQuery) && 
      f.to_city.toLowerCase().includes(toQuery)
    );
    setSearchResults(results);
    setHasSearched(true);
  };

  const handleBook = async (flight, price) => {
    if (!isAuthenticated) {
      navigate("/account", { state: { from: "/flights" } });
      return;
    }
    setBookingFlight(flight.id);
    setSubmitting(true);
    
    try {
      // 1. Create Checkout Order on the Backend
      const { payment_order_id, checkout } = await bookingService.createPaymentCheckout({
        service_type: "flight",
        title: `Flight Search: ${flight.flight_number} trip`,
        summary: `${form.travellers} tickets, ${flight.from_city} to ${flight.to_city}`,
        total_amount: price * form.travellers,
        currency: "INR",
        tenant_id: flight.airline.id,
        metadata: {
          flight_number: flight.flight_number,
          airline: flight.airline.name,
          origin: flight.from_city,
          destination: flight.to_city,
          departure_time: flight.depart_time,
          arrival_time: flight.arrive_time,
          passengers: form.travellers,
          class: form.flightClass,
          date: form.departDate,
        },
      });

      // 2. Open Razorpay Modal
      const options = {
        ...checkout,
        handler: async (response) => {
          try {
            setSubmitting(true);
            toast.loading("Verifying your payment...", { id: "payment-verify" });

            // 3. Verify Payment on Backend
            await bookingService.verifyPayment({
              payment_order_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            toast.success("Flight booked successfully!", { id: "payment-verify" });
            navigate("/account"); // Redirect to My Activity
          } catch (err) {
            toast.error("Payment verification failed.", { id: "payment-verify" });
          } finally {
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setBookingFlight(null);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Could not initialize booking.");
      setSubmitting(false);
      setBookingFlight(null);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <section className="glass-panel rounded-[38px] px-6 py-8 sm:px-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[#037ffc]">Flight Network</p>
        <h1 className="font-display mt-3 text-6xl leading-none text-[#1f1812]">Find and book direct flights</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#68584b]">
          Search schedules across all our partnered airlines and operators. Book instant confirmed seats without any middlemen.
        </p>
      </section>

      {/* Search Bar */}
      <section className="soft-card rounded-[34px] p-6">
        <div className="grid gap-4 md:grid-cols-5 items-end">
          <label className="block md:col-span-1">
            <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#3f342a]">
              <PlaneTakeoff className="h-4 w-4" /> From
            </span>
            <input type="text" value={form.from} onChange={e => setField("from", e.target.value)} placeholder="City or code" className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#037ffc]" />
          </label>
          <label className="block md:col-span-1">
            <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#3f342a]">
              <PlaneLanding className="h-4 w-4" /> To
            </span>
            <input type="text" value={form.to} onChange={e => setField("to", e.target.value)} placeholder="City or code" className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#037ffc]" />
          </label>
          <label className="block md:col-span-1">
            <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#3f342a]">
              <CalendarDays className="h-4 w-4" /> Date
            </span>
            <input type="date" min={todayDate()} value={form.departDate} onChange={e => setField("departDate", e.target.value)} className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#037ffc]" />
          </label>
          <div className="md:col-span-1 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 text-[11px] font-medium text-[#3f342a]">Travellers</span>
              <input type="number" min={1} max={9} value={form.travellers} onChange={e => setField("travellers", parseInt(e.target.value)||1)} className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-3 py-3 outline-none focus:border-[#037ffc]" />
            </label>
            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 text-[11px] font-medium text-[#3f342a]">Class</span>
              <select value={form.flightClass} onChange={e => setField("flightClass", e.target.value)} className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-2 py-3 outline-none focus:border-[#037ffc]">
                <option value="economy">Econ</option>
                <option value="business">Biz</option>
                <option value="first">First</option>
              </select>
            </label>
          </div>
          <button onClick={searchFlights} className="md:col-span-1 rounded-[22px] bg-[#037ffc] px-4 py-3 text-sm font-semibold text-white transition-opacity hover:bg-[#0269d4] flex items-center justify-center gap-2 h-[50px]">
            <Plane className="h-4 w-4" /> Search
          </button>
        </div>
      </section>

      {/* Results */}
      {hasSearched && (
        <section className="space-y-6">
          <h2 className="text-2xl font-display text-[#1f1812]">
            {searchResults.length} Flights Found
          </h2>
          {searchResults.length === 0 ? (
            <div className="glass-panel rounded-[34px] p-10 text-center">
              <Plane className="h-12 w-12 text-[#d1c8c0] mx-auto mb-4 opacity-50" />
              <p className="text-[#68584b]">No direct flights available for this route.</p>
              <p className="text-sm text-[#8c7e73] mt-2">Try changing your dates or search for different cities.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {searchResults.map(f => {
                const getPriceAndSeats = () => {
                  if (form.flightClass === "business") return { price: f.business_price, seats: f.business_seats };
                  if (form.flightClass === "first") return { price: f.first_price, seats: f.first_seats };
                  return { price: f.economy_price, seats: f.economy_seats };
                };
                const { price, seats } = getPriceAndSeats();
                // Avoid booking if it is 0/null or sold out
                const isAvailable = price > 0 && seats >= form.travellers;

                return (
                  <div key={f.id} className="soft-card rounded-[28px] p-6 lg:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-[0_12px_40px_rgba(31,24,18,0.06)] hover:-translate-y-1 bg-white">
                    <div className="flex items-center gap-6 md:w-1/3">
                      {f.airline.logo ? (
                        <img src={f.airline.logo} className="w-16 h-16 object-contain rounded-xl bg-slate-50 p-2" alt={f.airline.name} />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center">
                          <Plane />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-[#1f1812] text-lg">{f.airline.name}</h3>
                        <p className="text-sm text-[#8c7e73] uppercase tracking-wider">{f.flight_number} • {f.aircraft_type}</p>
                      </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center gap-6 border-y md:border-y-0 border-[rgba(96,73,53,0.1)] py-6 md:py-0">
                      <div className="text-right">
                        <p className="text-3xl font-display text-[#1f1812] leading-none mb-1">{f.depart_time}</p>
                        <p className="font-semibold text-sm text-[#68584b] uppercase">{f.from_city}</p>
                      </div>
                      <div className="flex flex-col items-center px-4 md:px-8 w-40">
                        <p className="text-[10px] uppercase tracking-widest text-[#8c7e73] mb-2">{Math.floor(f.duration_min/60)}h {f.duration_min%60}m</p>
                        <div className="relative w-full h-[2px] bg-[rgba(96,73,53,0.1)] rounded-full">
                          <Plane className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[#c15d1f] w-4 h-4 bg-white px-0.5" />
                        </div>
                        <p className="text-[10px] uppercase tracking-widest text-green-600 mt-2 font-bold">Direct</p>
                      </div>
                      <div className="text-left">
                        <p className="text-3xl font-display text-[#1f1812] leading-none mb-1">{f.arrive_time}</p>
                        <p className="font-semibold text-sm text-[#68584b] uppercase">{f.to_city}</p>
                      </div>
                    </div>

                    <div className="md:w-1/4 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2">
                      <div className="text-left md:text-right">
                        <p className="text-xs text-[#8c7e73] uppercase tracking-wide mb-1">Total for {form.travellers}</p>
                        <p className="text-2xl font-bold text-[#1f1812]">{price ? formatCurrency(price * form.travellers) : "Unavailable"}</p>
                        {isAvailable && <p className="text-xs font-semibold text-green-600 mt-1">{seats} seats left!</p>}
                      </div>
                      <button
                        onClick={() => handleBook(f, price)}
                        disabled={submitting || !isAvailable}
                        className="rounded-full bg-[#1f1812] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#3f342a] disabled:opacity-50 flex items-center gap-2 flex-shrink-0"
                      >
                        {bookingFlight === f.id ? "Booking..." : isAvailable ? "Book Now" : "Sold Out"} <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Discovery / Popular Airlines (when empty) */}
      {!hasSearched && (
        <section>
          <h2 className="mb-6 font-display text-3xl text-[#1f1812]">Airlines on Zahi Connect</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <p className="text-[#8c7e73] col-span-full">Loading airline network...</p>
            ) : airlines.length === 0 ? (
              <p className="text-[#8c7e73] col-span-full">No active airlines currently.</p>
            ) : (
              airlines.map(airline => (
                <div key={airline.id} onClick={() => {
                  if (airline.routes && airline.routes.length > 0) {
                    const [from, to] = airline.routes[0].split(" → ");
                    setField("from", from);
                    setField("to", to);
                  }
                }} className="soft-card rounded-[28px] p-6 hover:shadow-[0_12px_40px_rgba(31,24,18,0.06)] hover:-translate-y-1 transition cursor-pointer bg-white group">
                  <div className="flex items-center gap-4 border-b border-[rgba(96,73,53,0.06)] pb-4">
                    {airline.logo ? (
                      <img src={airline.logo} className="w-12 h-12 rounded-[14px] object-cover bg-slate-50 border border-slate-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-[14px] bg-[#f0ede6] flex items-center justify-center text-[#c15d1f]">
                        <Plane size={24} />
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-lg text-[#1f1812] group-hover:text-[#037ffc] transition">{airline.name}</h3>
                      <p className="text-xs text-[#8c7e73]">{airline.total_flights} scheduled flights</p>
                    </div>
                  </div>
                  <div className="pt-4">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#8c7e73] mb-2">Popular Routes</p>
                    <div className="flex flex-wrap gap-2">
                      {airline.routes && airline.routes.slice(0,3).map(r => (
                        <span key={r} className="bg-[#f5f3f0] text-[#68584b] text-[11px] px-2 py-1 rounded-md font-medium border border-[#ece8e2]">{r}</span>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}
    </div>
  );
};

export default FlightsPage;
