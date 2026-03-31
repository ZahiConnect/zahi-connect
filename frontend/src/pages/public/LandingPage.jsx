import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  HiOutlineBell,
  HiOutlineChatAlt2,
  HiOutlineClipboardList,
  HiOutlineGlobeAlt,
  HiOutlineLightningBolt,
  HiOutlineSparkles,
} from "react-icons/hi";
import toast from "react-hot-toast";
import SubscriptionDialog from "../../components/SubscriptionDialog";
import { clearPurchaseIntent, getPurchaseIntent, rememberPurchaseIntent } from "../../lib/purchaseIntent";
import { getHomeRouteForUser, hasMultipleWorkspaces, hasWorkspaceAccess } from "../../lib/workspace";
import subscriptionService from "../../services/subscriptionService";

const serviceShowcase = [
  {
    title: "Restaurant operations",
    eyebrow: "Kitchen meets WhatsApp",
    description:
      "Menus, orders, tables, and kitchen flow can sit in one owner dashboard while guests order through chat.",
  },
  {
    title: "Hotel command center",
    eyebrow: "Stay workflow",
    description:
      "Bookings, room setup, pricing, guests, and operational settings now live inside the hotel workspace.",
  },
  {
    title: "Mobility dispatch",
    eyebrow: "Local transport",
    description:
      "Cab and auto owners can list drivers, watch requests arrive, and run a lightweight dispatch board without building an Uber clone.",
  },
];

const proofCards = [
  {
    title: "One chat-first customer journey",
    body: "Guests ask for food, rooms, rides, or support from one Zahi number and the system routes the request behind the scenes.",
    icon: HiOutlineChatAlt2,
  },
  {
    title: "Owners get one command center",
    body: "Each business pays for the workspace it needs, then sees dashboards and tools that match that business model.",
    icon: HiOutlineClipboardList,
  },
  {
    title: "Built for layered modules",
    body: "Start with a single paid module now and grow into a wider hyperlocal stack without redoing onboarding later.",
    icon: HiOutlineLightningBolt,
  },
];

const operatingSteps = [
  {
    step: "01",
    title: "Owner chooses a plan",
    body: "A restaurant, hotel, or fleet owner signs up on Zahi Connect and pays for the right workspace.",
  },
  {
    step: "02",
    title: "Zahi opens the right dashboard",
    body: "The owner lands in a workspace shaped around menu ops, booking ops, or ride ops instead of a one-size-fits-none admin panel.",
  },
  {
    step: "03",
    title: "WhatsApp becomes the customer front door",
    body: "Customers interact through Zahi's chat layer while the owner sees clean operational actions inside the dashboard.",
  },
];

const LandingPage = () => {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();
  const canOpenDashboard = hasWorkspaceAccess(user);
  const hasManyWorkspaces = hasMultipleWorkspaces(user);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const planData = await subscriptionService.getPlans();
        setPlans(planData);
      } catch (error) {
        console.error("Unable to load subscription plans", error);
      } finally {
        setLoadingPlans(false);
      }
    };

    loadPlans();
  }, []);

  useEffect(() => {
    const requestedPlan = location.state?.openPlanCode || getPurchaseIntent();
    if (!isAuthenticated || loadingPlans || !requestedPlan || plans.length === 0) return;

    const matchedPlan = plans.find((plan) => plan.code === requestedPlan);
    if (!matchedPlan) return;

    setSelectedPlan(matchedPlan);
    clearPurchaseIntent();

    if (location.state?.openPlanCode) {
      navigate(location.pathname, { replace: true });
    }
  }, [isAuthenticated, loadingPlans, location.pathname, location.state, navigate, plans]);

  useEffect(() => {
    if (!location.state?.scrollToPricing && location.hash !== "#pricing") return;

    const timeout = window.setTimeout(() => {
      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (location.state?.scrollToPricing) {
        navigate(location.pathname, { replace: true });
      }
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [location.hash, location.pathname, location.state, navigate]);

  const scrollToPricing = () => {
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleHeaderAction = () => {
    if (canOpenDashboard) {
      navigate(getHomeRouteForUser(user));
      return;
    }

    scrollToPricing();
  };

  const handlePlanSelection = (plan) => {
    if (!isAuthenticated) {
      rememberPurchaseIntent(plan.code);
      toast("Sign in first, then we will continue your plan purchase.");
      navigate("/login");
      return;
    }

    setSelectedPlan(plan);
  };

  return (
    <div className="min-h-screen bg-[#F7F1EA] text-[#1F1A17]">
      <header className="sticky top-0 z-30 border-b border-[#E9DDD1] bg-[#F7F1EA]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#1F1A17] font-serif text-xl text-white">
              Z
            </div>
            <div>
              <p className="font-serif text-xl tracking-tight">Zahi Connect</p>
              <p className="text-xs uppercase tracking-[0.22em] text-[#9E6041]">Hyperlocal AI Ops</p>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm text-[#5C4A3C] lg:flex">
            <a href="#modules" className="transition-colors hover:text-[#1F1A17]">Modules</a>
            <a href="#how-it-works" className="transition-colors hover:text-[#1F1A17]">How it works</a>
            <a href="#pricing" className="transition-colors hover:text-[#1F1A17]">Pricing</a>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div className="hidden rounded-full border border-[#DCCDBC] bg-white/85 px-4 py-2 text-sm font-medium text-[#3D3027] sm:inline-flex">
                  {user?.tenant_name || user?.username || user?.email}
                </div>
                <button
                  type="button"
                  onClick={handleHeaderAction}
                  className="inline-flex rounded-full bg-[#1F1A17] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#35281F]"
                >
                  {canOpenDashboard
                    ? hasManyWorkspaces
                      ? "Choose dashboard"
                      : "Open dashboard"
                    : "Continue to pricing"}
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden rounded-full border border-[#DCCDBC] px-4 py-2 text-sm font-medium text-[#3D3027] transition-colors hover:bg-white sm:inline-flex"
                >
                  Sign in
                </Link>
                <button
                  type="button"
                  onClick={scrollToPricing}
                  className="inline-flex rounded-full bg-[#1F1A17] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#35281F]"
                >
                  Buy a workspace
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,#E4BFA0_0%,transparent_32%),radial-gradient(circle_at_bottom_left,#B8C49A_0%,transparent_28%)] opacity-70" />
          <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[1.12fr_0.88fr] lg:px-10 lg:py-24">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#DFC7B2] bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#A76541]">
                <HiOutlineSparkles className="text-sm" />
                WhatsApp-first owner platform
              </div>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-5xl font-serif leading-[1.02] text-[#1F1A17] sm:text-6xl lg:text-7xl">
                  The paid control room for restaurants, stays, and local rides.
                </h1>
                <p className="max-w-2xl text-lg leading-8 text-[#5C4A3C] sm:text-xl">
                  Zahi Connect is your business-facing command center plus a public AI layer.
                  Owners buy a plan, unlock the right dashboard, and let customers reach them
                  through WhatsApp or the Zahi web experience.
                </p>
              </div>

              <div className="flex flex-wrap gap-4">
                <a
                  href="#pricing"
                  className="inline-flex rounded-full bg-[#1F1A17] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#35281F]"
                >
                  Explore paid workspaces
                </a>
                <Link
                  to="/login"
                  className="inline-flex rounded-full border border-[#DCCDBC] bg-white/85 px-6 py-3.5 text-sm font-semibold text-[#3A2C21] transition-colors hover:bg-white"
                >
                  Sign in to existing dashboard
                </Link>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-[#E9DCCE] bg-white/70 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A76541]">For owners</p>
                  <p className="mt-3 text-sm leading-6 text-[#5C4A3C]">Choose a module and unlock the right dashboard immediately after payment.</p>
                </div>
                <div className="rounded-3xl border border-[#E9DCCE] bg-white/70 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A76541]">For customers</p>
                  <p className="mt-3 text-sm leading-6 text-[#5C4A3C]">Order food, ask for rooms, or request transport through one AI-facing experience.</p>
                </div>
                <div className="rounded-3xl border border-[#E9DCCE] bg-white/70 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#A76541]">For your roadmap</p>
                  <p className="mt-3 text-sm leading-6 text-[#5C4A3C]">Start with a clean paid entry point now and merge the larger StayInn module next.</p>
                </div>
              </div>
            </div>

            <div className="relative flex items-center">
              <div className="w-full rounded-[34px] border border-[#E7D7C7] bg-[#1F1A17] p-6 text-white shadow-[0_30px_80px_rgba(60,36,22,0.25)]">
                <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(150deg,#30231B_0%,#7B4A32_62%,#C2734B_100%)] p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm uppercase tracking-[0.22em] text-white/70">Live stack</p>
                      <h2 className="mt-2 text-2xl font-serif">One paid layer, multiple service rails.</h2>
                    </div>
                    <div className="rounded-2xl bg-white/10 p-3">
                      <HiOutlineGlobeAlt className="text-2xl text-[#F6C9A8]" />
                    </div>
                  </div>

                  <div className="mt-8 space-y-4">
                    <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-white/70">Public layer</p>
                          <p className="mt-1 font-medium">Zahi site + WhatsApp AI entry</p>
                        </div>
                        <HiOutlineBell className="text-xl text-[#F6C9A8]" />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                        <p className="text-sm text-white/70">Owner dashboards</p>
                        <p className="mt-2 font-medium">Restaurant, Hotel, Mobility</p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                        <p className="text-sm text-white/70">Growth path</p>
                        <p className="mt-2 font-medium">StayInn merge-ready</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
                      <p className="text-sm text-white/70">Why this matters</p>
                      <p className="mt-2 text-sm leading-6 text-white/85">
                        Owners are not buying a brochure website. They are buying a live control
                        room for their business plus a smarter customer entry point.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="modules" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm uppercase tracking-[0.24em] text-[#A76541]">Service rails</p>
            <h2 className="mt-3 text-4xl font-serif text-[#1F1A17] sm:text-5xl">
              One platform, three paid entry points.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#5C4A3C]">
              You are not launching every deep product at once. You are launching a single public
              brand with focused workspaces that can expand as your friend’s modules get merged in.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {serviceShowcase.map((service) => (
              <article
                key={service.title}
                className="rounded-[28px] border border-[#E8DDD1] bg-white p-7 shadow-sm transition-transform duration-300 hover:-translate-y-1"
              >
                <p className="text-sm uppercase tracking-[0.18em] text-[#A76541]">{service.eyebrow}</p>
                <h3 className="mt-4 text-2xl font-serif text-[#1F1A17]">{service.title}</h3>
                <p className="mt-4 text-sm leading-7 text-[#625446]">{service.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-y border-[#E8DDD1] bg-[#F1E5D8]">
          <div className="mx-auto grid max-w-7xl gap-5 px-5 py-14 sm:px-8 lg:grid-cols-3 lg:px-10 lg:py-16">
            {proofCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="rounded-[28px] bg-[#FFFDF9] p-7 shadow-sm">
                  <div className="inline-flex rounded-2xl bg-[#FAEEE1] p-3 text-[#A76541]">
                    <Icon className="text-2xl" />
                  </div>
                  <h3 className="mt-5 text-2xl font-serif text-[#1F1A17]">{card.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-[#625446]">{card.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#A76541]">Operating model</p>
              <h2 className="mt-3 text-4xl font-serif text-[#1F1A17] sm:text-5xl">
                The owner buys the dashboard. The customer sees the convenience.
              </h2>
              <p className="mt-4 text-base leading-7 text-[#5C4A3C]">
                This is the clearest way to explain Zahi Connect without getting lost in technical
                language. Your product is a paid owner workspace connected to an AI-facing customer
                surface.
              </p>
            </div>

            <div className="space-y-4">
              {operatingSteps.map((item) => (
                <article
                  key={item.step}
                  className="rounded-[28px] border border-[#E8DDD1] bg-white p-7 shadow-sm"
                >
                  <p className="text-sm uppercase tracking-[0.2em] text-[#A76541]">Step {item.step}</p>
                  <h3 className="mt-3 text-2xl font-serif text-[#1F1A17]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#625446]">{item.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm uppercase tracking-[0.24em] text-[#A76541]">Pricing</p>
            <h2 className="mt-3 text-4xl font-serif text-[#1F1A17] sm:text-5xl">
              Buy the workspace that matches the business you are onboarding.
            </h2>
            <p className="mt-4 text-base leading-7 text-[#5C4A3C]">
              These plans are positioned as premium onboarding workspaces. Payment unlocks the
              dashboard immediately, and you can deepen each module over time.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {loadingPlans
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-[360px] animate-pulse rounded-[30px] border border-[#E8DDD1] bg-white/70"
                  />
                ))
              : plans.map((plan) => (
                  <article
                    key={plan.code}
                    className={`rounded-[30px] border p-7 shadow-sm transition-transform duration-300 hover:-translate-y-1 ${
                      plan.featured
                        ? "border-[#CC815A] bg-[#1F1A17] text-white"
                        : "border-[#E8DDD1] bg-white text-[#1F1A17]"
                    }`}
                  >
                    <p className={`text-xs uppercase tracking-[0.24em] ${plan.featured ? "text-[#F4C7A7]" : "text-[#A76541]"}`}>
                      {plan.badge}
                    </p>
                    <h3 className="mt-4 text-3xl font-serif">{plan.name}</h3>
                    <p className={`mt-4 text-sm leading-7 ${plan.featured ? "text-white/78" : "text-[#625446]"}`}>
                      {plan.description}
                    </p>
                    <p className="mt-6 text-3xl font-serif">{plan.display_price}</p>

                    <div className="mt-6 space-y-3">
                      {plan.dashboard_modules.map((moduleName) => (
                        <div
                          key={moduleName}
                          className={`inline-flex w-full rounded-2xl px-4 py-3 text-sm ${
                            plan.featured
                              ? "bg-white/8 text-white/90"
                              : "bg-[#FBF5EE] text-[#5C4A3C]"
                          }`}
                        >
                          {moduleName}
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePlanSelection(plan)}
                      className={`mt-8 w-full rounded-full px-5 py-3 text-sm font-semibold transition-colors ${
                        plan.featured
                          ? "bg-white text-[#1F1A17] hover:bg-[#F7ECE2]"
                          : "bg-[#1F1A17] text-white hover:bg-[#35281F]"
                      }`}
                    >
                      Buy {plan.name}
                    </button>
                  </article>
                ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8 lg:px-10">
          <div className="rounded-[34px] border border-[#E8DDD1] bg-[linear-gradient(135deg,#FFF7EF_0%,#F7E9DA_55%,#ECD7C4_100%)] p-8 shadow-sm sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-[#A76541]">Why this first</p>
                <h2 className="mt-3 text-4xl font-serif text-[#1F1A17] sm:text-5xl">
                  Launch the paid owner entry point now. Merge the deeper hotel engine next.
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-7 text-[#5C4A3C]">
                  This gets you the brand story, premium purchase motion, and dashboard unlock in
                  place before you fold `StayInn-main` into the hotel workspace. It is the right
                  foundation for the next integration step.
                </p>
              </div>
              <a
                href="#pricing"
                className="inline-flex items-center justify-center rounded-full bg-[#1F1A17] px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#35281F]"
              >
                Start with a plan
              </a>
            </div>
          </div>
        </section>
      </main>

      <SubscriptionDialog
        isOpen={Boolean(selectedPlan)}
        plan={selectedPlan}
        onClose={() => setSelectedPlan(null)}
      />
    </div>
  );
};

export default LandingPage;
