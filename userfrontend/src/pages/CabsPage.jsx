import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CarFront, MapPin, Route, Users } from "lucide-react";
import toast from "react-hot-toast";

import { useAuth } from "../context/AuthContext";
import { formatShortDate, todayDate } from "../lib/format";
import bookingService from "../services/bookingService";

const CabsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    pickup: "",
    drop: "",
    travelDate: todayDate(),
    passengers: 2,
  });

  const setField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submitInterest = async () => {
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `${location.pathname}${location.search}` } });
      return;
    }

    if (!form.pickup || !form.drop) {
      toast.error("Add both pickup and drop locations.");
      return;
    }

    setSubmitting(true);
    try {
      await bookingService.createRequest({
        service_type: "cab",
        title: `Cab request from ${form.pickup} to ${form.drop}`,
        summary: `${form.passengers} passenger(s) on ${formatShortDate(form.travelDate)}`,
        metadata: {
          pickup: form.pickup,
          drop: form.drop,
          travel_date: form.travelDate,
          passengers: form.passengers,
          source: "customer_waitlist",
        },
      });
      toast.success("Cab request saved. This lane is now tracked in your account.");
      navigate("/account");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Could not save the cab request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-10">
      <section className="glass-panel rounded-[38px] px-6 py-8 sm:px-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[#c15d1f]">Cab lane</p>
        <h1 className="font-display mt-3 text-6xl leading-none text-[#1f1812]">Airport transfers and local rides</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#68584b]">
          The full dispatch backend is still ahead of us, but the customer-facing ride lane is ready
          now so you can collect demand and keep the product structure complete.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="soft-card rounded-[34px] p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1f1812] text-white">
              <CarFront className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Customer flow</p>
              <h2 className="font-display text-4xl leading-none text-[#1f1812]">Capture ride requests now</h2>
            </div>
          </div>

          <div className="mt-6 grid gap-4">
            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#3f342a]">
                <MapPin className="h-4 w-4" />
                Pickup
              </span>
              <input
                type="text"
                value={form.pickup}
                onChange={(event) => setField("pickup", event.target.value)}
                placeholder="Airport, hotel, or landmark"
                className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#d66a2f]"
              />
            </label>

            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#3f342a]">
                <Route className="h-4 w-4" />
                Drop
              </span>
              <input
                type="text"
                value={form.drop}
                onChange={(event) => setField("drop", event.target.value)}
                placeholder="Destination address"
                className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#d66a2f]"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-[#3f342a]">Travel date</span>
                <input
                  type="date"
                  value={form.travelDate}
                  onChange={(event) => setField("travelDate", event.target.value)}
                  className="w-full rounded-[22px] border border-[rgba(96,73,53,0.14)] bg-white px-4 py-3 outline-none focus:border-[#d66a2f]"
                />
              </label>
              <label className="block">
                <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-[#3f342a]">
                  <Users className="h-4 w-4" />
                  Passengers
                </span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={form.passengers}
                  onChange={(event) => setField("passengers", Number(event.target.value) || 1)}
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
            {submitting ? "Saving request..." : isAuthenticated ? "Save cab request" : "Sign in to request"}
          </button>
        </section>

        <section className="soft-card rounded-[34px] p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Why add this now</p>
          <div className="mt-5 space-y-3 text-sm leading-7 text-[#68584b]">
            <div className="rounded-[24px] bg-[#fbf2e7] px-4 py-4">
              Customers can express ride demand before you finish the operator dispatch system.
            </div>
            <div className="rounded-[24px] bg-[#fbf2e7] px-4 py-4">
              Saved requests appear in the customer account, which makes this lane feel real instead
              of purely decorative.
            </div>
            <div className="rounded-[24px] bg-[#fbf2e7] px-4 py-4">
              When the mobility backend arrives, this screen can evolve into a proper booking flow
              without changing the consumer information architecture.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default CabsPage;
