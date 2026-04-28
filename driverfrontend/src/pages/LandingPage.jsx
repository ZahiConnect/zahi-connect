import { Link } from "react-router-dom";
import { ArrowRight, CarFront, MapPinned, ShieldCheck, Wallet } from "lucide-react";

import { useAuth } from "../context/AuthContext";

const LandingPage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="space-y-12">
      <section className="drive-panel overflow-hidden rounded-[32px] px-6 py-12 sm:px-12 lg:px-16 bg-white shadow-xl isolate relative">
        <div className="absolute right-0 top-0 -z-10 w-96 h-96 bg-[#facc15]/10 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
        <div className="absolute left-0 bottom-0 -z-10 w-96 h-96 bg-zinc-100 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-900 mb-6 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-[#facc15]" /> Premium Gateway
            </span>
            <h1 className="font-display mt-2 max-w-4xl text-5xl font-bold leading-[1.1] tracking-tight text-zinc-900 sm:text-6xl lg:text-7xl">
              Take the wheel.<br/>Own your routes.
            </h1>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-slate-500 font-medium">
              Join the Zahi Drive network. Register your vehicle, securely manage operational documents, and receive paid ride requests from nearby customers.
            </p>

            <div className="mt-10 flex flex-wrap gap-4 items-center">
              <Link
                to={isAuthenticated ? "/dashboard" : "/register"}
                className="inline-flex items-center gap-2 rounded-full bg-[#facc15] px-6 py-3.5 text-sm font-bold text-[#422006] shadow-md hover:bg-[#eab308] hover:shadow-lg transition-all active:scale-95"
              >
                {isAuthenticated ? "Open Dashboard" : "Register"}
                <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              {!isAuthenticated ? (
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-full border-2 border-slate-200 bg-white px-6 py-3.5 text-sm font-bold text-zinc-900 hover:bg-slate-50 hover:border-slate-300 transition-colors"
                >
                  Operator Sign In
                </Link>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            {[
              {
                icon: Wallet,
                title: "Zero Subscription Shield",
                body: "Independent drivers pay nothing upfront. Zahi aligns with your success, claiming commission only exclusively on cleared payments.",
              },
              {
                icon: MapPinned,
                title: "Location Precision",
                body: "Save your accurate operating area so paid cab requests can be matched to the right nearby drivers.",
              },
              {
                icon: ShieldCheck,
                title: "Fortified Onboarding",
                body: "Drop your Aadhaar, licence, and RC. We execute rigorous vault verifications to give you a verified operator badge.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="drive-card rounded-3xl p-6 group hover:border-slate-300 transition-colors bg-white">
                  <div className="flex items-start gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-900 group-hover:bg-[#facc15] group-hover:text-[#422006] transition-colors">
                      <Icon className="h-5 w-5" strokeWidth={2.5} />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold tracking-tight text-zinc-900">{item.title}</h2>
                      <p className="mt-2 text-sm leading-relaxed text-slate-500 font-medium">{item.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-3">
        {[
          {
            title: "Fleet Registration",
            body: "Create your verified driver asset tag. Bind your primary vehicle and execute document vaults to clear dispatch security protocols.",
          },
          {
            title: "Request Matching",
            body: "Your saved location and vehicle profile help route customer cab requests to the right driver workspace.",
          },
          {
            title: "Asset Telemetry",
            body: "Audit down to the penny. Full transparency over net receipts, Zahi route commissions, and your absolute clearance balance.",
          },
        ].map((item) => (
          <div key={item.title} className="drive-card rounded-[24px] p-8 hover:shadow-md transition-shadow bg-white">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-[#facc15]">
              <CarFront className="h-6 w-6" strokeWidth={2.5}/>
            </div>
            <h3 className="font-display mt-6 text-2xl font-bold tracking-tight text-zinc-900">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 font-medium">{item.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
};

export default LandingPage;
