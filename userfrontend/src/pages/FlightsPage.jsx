import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, Plane, PlaneTakeoff, Users } from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import { formatShortDate, todayDate } from "../lib/format";
import bookingService from "../services/bookingService";

const FlightsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    from: "",
    to: "",
    departDate: todayDate(),
    travellers: 1,
  });

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitInterest = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }

    if (!form.from || !form.to) {
      toast.error("Add both source and destination cities.");
      return;
    }

    setSubmitting(true);
    try {
      await bookingService.createRequest({
        service_type: "flight",
        title: `Flight request from ${form.from} to ${form.to}`,
        summary: `${form.travellers} traveller(s) on ${formatShortDate(form.departDate)}`,
        metadata: {
          from: form.from,
          to: form.to,
          depart_date: form.departDate,
          travellers: form.travellers,
          source: "customer_waitlist",
        },
      });
      toast.success("Flight request saved. You can now track it in your account.");
      navigate("/account");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not save the flight request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="glass-panel rounded-[38px] px-6 py-8 sm:px-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[#c15d1f]">Flight lane</p>
        <h1 className="font-display mt-3 text-6xl leading-none text-[#1f1812]">Travel search structure is ready now</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#68584b]">
          The search and ticketing backend comes later, but customers can already express travel
          intent from the same portal instead of seeing an unfinished dead end.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="soft-card rounded-[34px] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f1812] text-white">
              <Plane className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Customer flow</p>
              <h2 className="font-display text-4xl leading-none text-[#1f1812]">Capture flight intent now</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#3f342a]">
                <PlaneTakeoff className="h-4 w-4" />
                From
              </span>
              <input
                type="text"
                value={form.from}
                onChange={(event) => setField("from", event.target.value)}
                placeholder="Departure city"
                className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#d66a2f]"
              />
            </label>

            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#3f342a]">
                <Plane className="h-4 w-4" />
                To
              </span>
              <input
                type="text"
                value={form.to}
                onChange={(event) => setField("to", event.target.value)}
                placeholder="Arrival city"
                className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#d66a2f]"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#3f342a]">
                  <CalendarDays className="h-4 w-4" />
                  Departure
                </span>
                <input
                  type="date"
                  value={form.departDate}
                  onChange={(event) => setField("departDate", event.target.value)}
                  className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#d66a2f]"
                />
              </label>
              <label className="block">
                <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#3f342a]">
                  <Users className="h-4 w-4" />
                  Travellers
                </span>
                <input
                  type="number"
                  min="1"
                  max="9"
                  value={form.travellers}
                  onChange={(event) => setField("travellers", Number(event.target.value) || 1)}
                  className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#d66a2f]"
                />
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={submitInterest}
            disabled={submitting}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-[#1f1812] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submitting ? "Saving request..." : isAuthenticated ? "Save flight request" : "Sign in to request"}
          </button>
        </section>

        <section className="soft-card rounded-[34px] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Why keep this lane visible</p>
          <div className="mt-5 space-y-3 text-sm leading-7 text-[#68584b]">
            <div className="rounded-[24px] bg-[#fbf2e7] px-4 py-4">
              The information architecture already feels like a multi-service travel product.
            </div>
            <div className="rounded-[24px] bg-[#fbf2e7] px-4 py-4">
              Customers can save flight intent now instead of waiting for a later big-bang launch.
            </div>
            <div className="rounded-[24px] bg-[#fbf2e7] px-4 py-4">
              Once the travel backend arrives, you can replace the waitlist request with live fare
              search while keeping the same page and route structure.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FlightsPage;
