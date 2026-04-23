import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValue, useSpring, useInView } from "framer-motion";
import {
  FiArrowRight, FiCommand, FiLayers, FiDatabase,
  FiMonitor, FiGlobe, FiLayout, FiCheckCircle,
  FiShield, FiTrendingUp, FiZap, FiMenu, FiX,
  FiCpu, FiActivity,
} from "react-icons/fi";
import toast from "react-hot-toast";
import SubscriptionDialog from "../../components/SubscriptionDialog";
import { clearPurchaseIntent, getPurchaseIntent, rememberPurchaseIntent } from "../../lib/purchaseIntent";
import { getHomeRouteForUser, hasMultipleWorkspaces, hasWorkspaceAccess } from "../../lib/workspace";
import subscriptionService from "../../services/subscriptionService";

/* ─────────────────────────────────────────────────────────────
   DATA
───────────────────────────────────────────────────────────── */
const serviceShowcase = [
  {
    title: "Restaurant Management",
    eyebrow: "Smart Dining Ops",
    description: "End-to-end operations from kitchen flow to table management and digital menus, seamlessly interconnected in one unified dashboard.",
    icon: FiMonitor, accent: "#6C5CE7", bg: "#F3F1FE",
  },
  {
    title: "Hotel Command Center",
    eyebrow: "Elevated Hospitality",
    description: "Centralize bookings, room availability, dynamic pricing, and guest services within an intuitive, real-time control room.",
    icon: FiLayout, accent: "#0984E3", bg: "#EBF5FD",
  },
  {
    title: "Aviation & Flights",
    eyebrow: "Global Connectivity",
    description: "Manage flight schedules, integrate with airline networks, and provide smooth travel bookings for your customers.",
    icon: FiGlobe, accent: "#00B894", bg: "#E8FAF4",
  },
];

const proofCards = [
  { title: "Unified Customer Journey", body: "Deliver a seamless experience allowing customers to request services effortlessly via our smart public layer.", icon: FiLayers, accent: "#6C5CE7", bg: "#F3F1FE" },
  { title: "Powerful Core Dashboard", body: "Total structural control. Access tailored analytics, real-time requests, and operational tools from any device.", icon: FiCommand, accent: "#00B894", bg: "#E8FAF4" },
  { title: "Scalable Infrastructure", body: "Start with the module you need today, and expand your digital suite instantly as your business grows.", icon: FiDatabase, accent: "#0984E3", bg: "#EBF5FD" },
];

const operatingSteps = [
  { step: "01", title: "Choose your workspace", body: "Select the purpose-built modular plan tailored specifically for your industry's operational requirements." },
  { step: "02", title: "Unlock the control room", body: "Instantly access professional tools — from dynamic pricing engines to complex booking dispatch systems." },
  { step: "03", title: "Empower your operations", body: "Let Zahi Connect handle public requests and transform them into organized workflow actions internally." },
];

const tickerItems = [
  "Restaurant Management", "Hotel Bookings", "Flight Scheduling",
  "Real-time Analytics", "Secure Workspaces", "Team Collaboration",
  "Revenue Tracking", "Guest Management", "Digital Menus", "Driver Dispatch",
];

const heroStats = [
  { label: "Active Workspaces", value: "3 Types", icon: FiZap, accent: "#6C5CE7", bg: "#F3F1FE" },
  { label: "Real-time Sync", value: "WebSocket", icon: FiDatabase, accent: "#00B894", bg: "#E8FAF4" },
  { label: "Data Security", value: "Encrypted", icon: FiShield, accent: "#0984E3", bg: "#EBF5FD" },
  { label: "Industry Modules", value: "3+ Suites", icon: FiLayers, accent: "#E17055", bg: "#FEF0EB" },
];

/* ─────────────────────────────────────────────────────────────
   ANIMATION VARIANTS
───────────────────────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: (delay = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay } }),
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const slideIn = {
  hidden: { opacity: 0, x: 24 },
  show: (delay = 0) => ({ opacity: 1, x: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1], delay } }),
};

/* ─────────────────────────────────────────────────────────────
   HELPER COMPONENTS
───────────────────────────────────────────────────────────── */

/** Wraps section and triggers fade-up once in view */
const RevealSection = ({ children, className = "", delay = 0 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
      custom={delay}
      variants={fadeUp}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/** Animated number counter */
const Counter = ({ target, suffix = "" }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const motionVal = useMotionValue(0);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 18 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) motionVal.set(target);
  }, [inView, motionVal, target]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => setDisplay(Math.round(v)));
    return unsub;
  }, [spring]);

  return <span ref={ref}>{display}{suffix}</span>;
};

/** Scrolling marquee ticker */
const Ticker = () => {
  const items = [...tickerItems, ...tickerItems];
  return (
    <div className="overflow-hidden border-y border-gray-100 py-4 bg-gray-50/50">
      <motion.div
        className="flex gap-8 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, ease: "linear", repeat: Infinity }}
      >
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.18em] text-gray-400 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 inline-block" />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
const LandingPage = () => {
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const location = useLocation();
  const navigate = useNavigate();

  const canOpenDashboard = hasWorkspaceAccess(user);
  const hasManyWorkspaces = hasMultipleWorkspaces(user);

  // Parallax on hero background
  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 400], [0, 70]);

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const planData = await subscriptionService.getPlans();
        setPlans(planData.filter(p =>
          !p.name.toLowerCase().includes("mobility") &&
          !p.name.toLowerCase().includes("cab")
        ));
      } catch (e) { console.error(e); }
      finally { setLoadingPlans(false); }
    };
    loadPlans();
  }, []);

  useEffect(() => {
    const requestedPlan = location.state?.openPlanCode || getPurchaseIntent();
    if (!isAuthenticated || loadingPlans || !requestedPlan || plans.length === 0) return;
    const match = plans.find(p => p.code === requestedPlan);
    if (!match) return;
    setSelectedPlan(match);
    clearPurchaseIntent();
    if (location.state?.openPlanCode) navigate(location.pathname, { replace: true });
  }, [isAuthenticated, loadingPlans, location, navigate, plans]);

  useEffect(() => {
    if (!location.state?.scrollToPricing && location.hash !== "#pricing") return;
    const t = window.setTimeout(() => {
      document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (location.state?.scrollToPricing) navigate(location.pathname, { replace: true });
    }, 120);
    return () => window.clearTimeout(t);
  }, [location, navigate]);

  const scrollToPricing = () =>
    document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleHeaderAction = () => {
    if (canOpenDashboard) { navigate(getHomeRouteForUser(user)); return; }
    scrollToPricing();
  };

  const handlePlanSelection = (plan) => {
    if (!isAuthenticated) {
      rememberPurchaseIntent(plan.code);
      toast("Sign in first, then we will continue your plan purchase.");
      navigate("/login"); return;
    }
    setSelectedPlan(plan);
  };

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }} className="min-h-screen bg-white selection:bg-violet-100 overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────── */}
      <motion.header
        initial={{ y: -64, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-gray-100"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-[68px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: [0, -8, 8, 0], scale: 1.05 }}
              transition={{ duration: 0.4 }}
              className="w-9 h-9 rounded-xl bg-gray-900 flex items-center justify-center text-white font-bold text-lg cursor-pointer"
            >Z</motion.div>
            <div>
              <p className="font-extrabold text-[15px] leading-none tracking-tight text-gray-900">Zahi Connect</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-gray-400 mt-0.5">Business Portal</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            {[["#modules", "Solutions"], ["#how-it-works", "Architecture"], ["#pricing", "Pricing"]].map(([href, label]) => (
              <motion.a
                key={href} href={href}
                className="text-[13px] font-semibold text-gray-500 hover:text-gray-900 transition-colors relative group"
                whileHover={{ y: -1 }}
              >
                {label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-violet-500 rounded-full group-hover:w-full transition-all duration-300" />
              </motion.a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <span className="text-[12px] font-semibold text-gray-500 max-w-[140px] truncate">
                  {user?.tenant_name || user?.username || user?.email}
                </span>
                <motion.button
                  whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                  type="button" onClick={handleHeaderAction}
                  className="inline-flex items-center gap-2 bg-gray-900 text-white text-[13px] font-bold px-5 py-2.5 rounded-full hover:bg-black transition-colors"
                >
                  {canOpenDashboard ? (hasManyWorkspaces ? "Select Dashboard" : "Enter Dashboard") : "View Workspaces"}
                  <FiArrowRight />
                </motion.button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-[13px] font-semibold text-gray-600 hover:text-gray-900 transition-colors px-4 py-2.5">
                  Sign in
                </Link>
                <motion.button
                  whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  type="button" onClick={scrollToPricing}
                  className="inline-flex items-center gap-2 bg-violet-600 text-white text-[13px] font-bold px-5 py-2.5 rounded-full hover:bg-violet-700 transition-colors shadow-lg shadow-violet-200"
                >
                  Get Started <FiArrowRight />
                </motion.button>
              </>
            )}
          </div>

          <button className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors" onClick={() => setMobileNavOpen(!mobileNavOpen)}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={mobileNavOpen ? "x" : "menu"} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                {mobileNavOpen ? <FiX size={20} /> : <FiMenu size={20} />}
              </motion.span>
            </AnimatePresence>
          </button>
        </div>

        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-gray-100 bg-white px-5 pb-5 overflow-hidden"
            >
              <div className="flex flex-col gap-1 pt-3">
                {[["#modules", "Solutions"], ["#how-it-works", "Architecture"], ["#pricing", "Pricing"]].map(([href, label], i) => (
                  <motion.a key={href} href={href} onClick={() => setMobileNavOpen(false)}
                    initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.06 }}
                    className="text-[14px] font-semibold text-gray-600 hover:text-gray-900 py-3 border-b border-gray-50"
                  >{label}</motion.a>
                ))}
                <div className="pt-4 flex flex-col gap-3">
                  {isAuthenticated
                    ? <button type="button" onClick={() => { handleHeaderAction(); setMobileNavOpen(false); }} className="w-full bg-gray-900 text-white text-[14px] font-bold py-3 rounded-xl">Enter Dashboard</button>
                    : <>
                        <button type="button" onClick={() => { scrollToPricing(); setMobileNavOpen(false); }} className="w-full bg-violet-600 text-white text-[14px] font-bold py-3 rounded-xl">Get Started</button>
                        <Link to="/login" onClick={() => setMobileNavOpen(false)} className="w-full border border-gray-200 text-gray-700 text-[14px] font-bold py-3 rounded-xl text-center">Sign in</Link>
                      </>
                  }
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 space-y-28 pb-28">

        {/* ── HERO ────────────────────────────────────────────── */}
        <section className="pt-16 md:pt-24 relative">
          {/* Ambient glows – parallax */}
          <motion.div
            style={{ y: bgY }}
            className="absolute -top-20 -left-40 w-[600px] h-[600px] bg-violet-100/60 rounded-full blur-[140px] pointer-events-none"
          />
          <motion.div
            style={{ y: bgY }}
            className="absolute top-10 -right-40 w-[400px] h-[400px] bg-blue-100/50 rounded-full blur-[120px] pointer-events-none"
          />

          <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
            {/* Text side */}
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.span
                variants={fadeUp} custom={0}
                className="inline-flex items-center gap-2 bg-violet-50 border border-violet-100 text-violet-700 text-[11px] font-bold uppercase tracking-[0.18em] px-4 py-2 rounded-full mb-8"
              >
                <motion.span animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}>
                  <FiTrendingUp />
                </motion.span>
                Next-Gen Operations Hub
              </motion.span>

              <motion.h1
                variants={fadeUp} custom={0.1}
                style={{ fontFamily: "'DM Serif Display', Georgia, serif" }}
                className="text-5xl sm:text-6xl lg:text-[68px] leading-[1.08] text-gray-900 mb-6"
              >
                Run your entire<br />
                <motion.span
                  className="text-violet-600 italic"
                  initial={{ backgroundSize: "0% 3px" }}
                  animate={{ backgroundSize: "100% 3px" }}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  style={{ backgroundImage: "linear-gradient(#6C5CE7,#6C5CE7)", backgroundRepeat: "no-repeat", backgroundPosition: "0 100%" }}
                >
                  business ecosystem.
                </motion.span>
              </motion.h1>

              <motion.p variants={fadeUp} custom={0.2} className="text-[17px] font-medium leading-[1.75] text-gray-500 mb-10 max-w-lg">
                Zahi Connect is your enterprise-facing command center. Whether you manage hospitality,
                F&B, or travel bookings — centralize your tools and elevate service efficiency.
              </motion.p>

              <motion.div variants={fadeUp} custom={0.3} className="flex flex-col sm:flex-row gap-4">
                <motion.a
                  href="#pricing" whileHover={{ scale: 1.04, x: 2 }} whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white text-[14px] font-bold px-8 py-4 rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-900/10"
                >
                  Explore Workspaces <FiArrowRight />
                </motion.a>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 text-[14px] font-bold px-8 py-4 rounded-2xl hover:bg-gray-50 transition-all"
                  >
                    <FiShield className="text-gray-400" /> Sign in to portal
                  </Link>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* Stat cards – floating */}
            <div className="hidden lg:grid grid-cols-2 gap-4">
              {heroStats.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(0,0,0,0.08)" }}
                    className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm cursor-default"
                  >
                    <motion.div
                      className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                      style={{ background: stat.bg }}
                      whileHover={{ rotate: 6, scale: 1.1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Icon style={{ color: stat.accent }} className="text-xl" />
                    </motion.div>
                    <p className="text-2xl font-extrabold text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── TICKER ───────────────────────────────────────────── */}
        <RevealSection className="-mx-5 sm:-mx-8">
          <Ticker />
        </RevealSection>

        {/* ── METRICS ──────────────────────────────────────────── */}
        <RevealSection>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: 3, suffix: "+", label: "Industry Verticals" },
              { value: 99, suffix: "%", label: "Uptime SLA" },
              { value: 12, suffix: "x", label: "Faster Operations" },
              { value: 100, suffix: "%", label: "Secure & Encrypted" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, type: "spring", stiffness: 80 }}
                whileHover={{ y: -4 }}
                className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm"
              >
                <p style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="text-5xl text-violet-600 mb-2">
                  <Counter target={s.value} suffix={s.suffix} />
                </p>
                <p className="text-[12px] font-semibold uppercase tracking-widest text-gray-400">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </RevealSection>

        {/* ── PROOF CARDS ──────────────────────────────────────── */}
        <section>
          <motion.div
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="grid gap-6 md:grid-cols-3"
          >
            {proofCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  variants={fadeUp} custom={i * 0.08}
                  whileHover={{ y: -6, boxShadow: "0 24px 48px rgba(0,0,0,0.06)" }}
                  className="rounded-3xl border border-gray-100 bg-white p-8 transition-shadow"
                >
                  <motion.div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                    style={{ background: card.bg }}
                    whileHover={{ rotate: 8, scale: 1.1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Icon style={{ color: card.accent }} className="text-xl" />
                  </motion.div>
                  <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="text-[22px] text-gray-900 mb-3 leading-snug">
                    {card.title}
                  </h3>
                  <p className="text-[14px] font-medium leading-relaxed text-gray-500">{card.body}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* ── MODULES ──────────────────────────────────────────── */}
        <section id="modules">
          <RevealSection className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-600 mb-2">Core Solutions</p>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="text-4xl sm:text-5xl text-gray-900">
                Purpose-built<br />operational suites.
              </h2>
            </div>
            <p className="text-[15px] font-medium leading-relaxed text-gray-500 max-w-sm">
              Hyper-focused modules tailored for specific industries — giving your teams exactly the precision workflow they require.
            </p>
          </RevealSection>

          <motion.div
            variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }}
            className="grid gap-6 lg:grid-cols-3"
          >
            {serviceShowcase.map((service, i) => {
              const Icon = service.icon;
              return (
                <motion.div
                  key={service.title}
                  variants={slideIn} custom={i * 0.1}
                  whileHover={{ y: -8, boxShadow: "0 32px 64px rgba(0,0,0,0.08)" }}
                  className="group rounded-3xl border border-gray-100 bg-white p-8 transition-shadow"
                >
                  <motion.span
                    className="inline-flex text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6 border"
                    style={{ background: service.bg, color: service.accent, borderColor: `${service.accent}25` }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12 + 0.2 }}
                  >
                    {service.eyebrow}
                  </motion.span>

                  <motion.div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                    style={{ background: service.bg }}
                    whileHover={{ rotate: -6, scale: 1.12 }}
                    transition={{ type: "spring", stiffness: 250 }}
                  >
                    <Icon style={{ color: service.accent }} className="text-2xl" />
                  </motion.div>

                  <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="text-2xl text-gray-900 mb-3 group-hover:text-violet-700 transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-[14px] font-medium leading-relaxed text-gray-500">{service.description}</p>
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────── */}
        <section id="how-it-works">
          <RevealSection>
            <div className="rounded-[40px] bg-gray-950 p-10 md:p-16 text-white relative overflow-hidden">
              {/* Animated orbs */}
              <motion.div
                className="absolute top-0 right-0 w-[500px] h-[500px] bg-violet-600/15 rounded-full blur-[130px] pointer-events-none"
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"
                animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
              />
              {/* Grid dots */}
              <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

              <div className="relative z-10 grid gap-16 lg:grid-cols-[1fr_1.4fr] items-center">
                <motion.div
                  initial={{ opacity: 0, x: -40 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-400 mb-3">Architecture</p>
                  <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="text-4xl sm:text-5xl text-white leading-tight mb-6">
                    Intelligent processing for maximum yield.
                  </h2>
                  <p className="text-[15px] font-medium leading-relaxed text-gray-400 mb-8">
                    Zahi Connect bridges public interactions and back-office management — ensuring complete end-to-end automation.
                  </p>
                  <div className="flex flex-col gap-3">
                    {[
                      { icon: FiCheckCircle, label: "Secure & Encrypted", color: "#00B894", bg: "rgba(0,184,148,0.1)" },
                      { icon: FiDatabase, label: "Real-time WebSocket", color: "#6C5CE7", bg: "rgba(108,92,231,0.1)" },
                      { icon: FiCpu, label: "AI-aware Routing", color: "#0984E3", bg: "rgba(9,132,227,0.1)" },
                    ].map(({ icon: Icon, label, color, bg }, i) => (
                      <motion.div
                        key={label}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.12 }}
                        whileHover={{ x: 4 }}
                        className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-4"
                      >
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                          <Icon style={{ color }} />
                        </div>
                        <p className="text-[14px] font-semibold text-white">{label}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <div className="space-y-4">
                  {operatingSteps.map((item, i) => (
                    <motion.div
                      key={item.step}
                      initial={{ opacity: 0, x: 40 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.14, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                      whileHover={{ x: 4, backgroundColor: "rgba(255,255,255,0.07)" }}
                      className="bg-white/5 border border-white/10 rounded-3xl p-7 flex gap-6 transition-colors"
                    >
                      <motion.div
                        whileHover={{ rotate: 6, scale: 1.1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="w-12 h-12 rounded-2xl bg-violet-600/20 text-violet-400 flex items-center justify-center shrink-0 font-bold text-[18px]"
                      >
                        {item.step}
                      </motion.div>
                      <div>
                        <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="text-xl text-white mb-2">
                          {item.title}
                        </h3>
                        <p className="text-[14px] font-medium text-gray-400 leading-relaxed">{item.body}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </RevealSection>
        </section>

        {/* ── PRICING ──────────────────────────────────────────── */}
        <section id="pricing">
          <RevealSection className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-600 mb-3">Subscription Plans</p>
            <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="text-4xl sm:text-5xl text-gray-900 mb-5">
              Unlock your enterprise dashboard.
            </h2>
            <p className="text-[15px] font-medium leading-relaxed text-gray-500">
              Select the workspace package that aligns with your scale. Zero hidden fees.
            </p>
          </RevealSection>

          <div className="grid gap-6 lg:grid-cols-3">
            {loadingPlans
              ? Array.from({ length: 3 }).map((_, i) => (
                  <motion.div key={i} className="h-[420px] rounded-[32px] bg-gray-50 border border-gray-100"
                    animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }} />
                ))
              : plans.map((plan, i) => (
                  <motion.div
                    key={plan.code}
                    initial={{ opacity: 0, y: 32, scale: 0.96 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: i * 0.1, duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -6, boxShadow: plan.featured ? "0 40px 80px rgba(108,92,231,0.25)" : "0 24px 48px rgba(0,0,0,0.08)" }}
                    className={`rounded-[32px] p-8 md:p-10 flex flex-col transition-shadow ${
                      plan.featured ? "bg-gray-950 text-white" : "bg-white border border-gray-100 shadow-sm"
                    }`}
                  >
                    <div className="mb-8">
                      <motion.span
                        initial={{ opacity: 0, scale: 0.7 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className={`inline-flex px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest mb-5 border ${
                          plan.featured ? "bg-white/10 text-violet-300 border-white/10" : "bg-violet-50 text-violet-600 border-violet-100"
                        }`}
                      >
                        {plan.badge || "Professional"}
                      </motion.span>
                      <h3 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className={`text-3xl mb-2 ${plan.featured ? "text-white" : "text-gray-900"}`}>
                        {plan.name}
                      </h3>
                      <p className={`text-[14px] font-medium leading-relaxed h-10 ${plan.featured ? "text-gray-400" : "text-gray-500"}`}>
                        {plan.description}
                      </p>
                    </div>

                    <div className={`mb-8 pb-8 border-b ${plan.featured ? "border-white/10" : "border-gray-100"}`}>
                      <p className={`text-5xl font-extrabold mb-1 ${plan.featured ? "text-white" : "text-gray-900"}`}>
                        {plan.display_price || "—"}
                      </p>
                      <p className={`text-[11px] font-bold uppercase tracking-widest ${plan.featured ? "text-gray-500" : "text-gray-400"}`}>
                        Per month · Auto-billed
                      </p>
                    </div>

                    <div className="mb-8 space-y-3.5 flex-1">
                      {plan.dashboard_modules.map((mod, mi) => (
                        <motion.div
                          key={mod}
                          initial={{ opacity: 0, x: -12 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.3 + mi * 0.06 }}
                          className="flex items-start gap-3"
                        >
                          <FiCheckCircle className={`mt-0.5 shrink-0 text-base ${plan.featured ? "text-violet-400" : "text-violet-600"}`} />
                          <span className={`text-[14px] font-medium ${plan.featured ? "text-gray-300" : "text-gray-600"}`}>{mod}</span>
                        </motion.div>
                      ))}
                    </div>

                    <motion.button
                      type="button" onClick={() => handlePlanSelection(plan)}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className={`w-full rounded-2xl h-14 font-bold text-[14px] flex items-center justify-center gap-2 ${
                        plan.featured
                          ? "bg-violet-600 text-white hover:bg-violet-700 shadow-lg shadow-violet-900/30"
                          : "bg-gray-900 text-white hover:bg-black shadow-md shadow-gray-900/10"
                      }`}
                    >
                      Get {plan.name} <FiArrowRight />
                    </motion.button>
                  </motion.div>
                ))}
          </div>
        </section>

        {/* ── FOOTER CTA ───────────────────────────────────────── */}
        <RevealSection>
          <div className="rounded-[40px] border border-gray-100 bg-gray-50 p-12 md:p-16 text-center relative overflow-hidden">
            <motion.div
              className="absolute top-0 right-0 w-[350px] h-[350px] bg-violet-100/70 rounded-full blur-[100px] pointer-events-none"
              animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative z-10">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-violet-600 mb-4">Ready to launch?</p>
              <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif" }} className="text-4xl sm:text-5xl text-gray-900 mb-5 max-w-2xl mx-auto">
                Your business control room is one click away.
              </h2>
              <p className="text-[15px] font-medium text-gray-500 max-w-lg mx-auto mb-10">
                Join business owners using Zahi Connect to manage hospitality, dining, and travel operations from one seamless platform.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.a
                  href="#pricing" whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}
                  className="inline-flex items-center justify-center gap-2 bg-gray-900 text-white text-[14px] font-bold px-9 py-4 rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-900/10"
                >
                  View Plans <FiArrowRight />
                </motion.a>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Link to="/login" className="inline-flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 text-[14px] font-bold px-9 py-4 rounded-2xl hover:bg-gray-50 transition-all">
                    Sign in
                  </Link>
                </motion.div>
              </div>
            </div>
          </div>
        </RevealSection>

      </main>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <motion.footer
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}
        className="border-t border-gray-100 bg-white"
      >
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white font-bold text-sm">Z</div>
            <p className="text-[14px] font-bold text-gray-900">Zahi Connect</p>
          </div>
          <p className="text-[13px] text-gray-400 font-medium">© {new Date().getFullYear()} Zahi Connect. All rights reserved.</p>
          <div className="flex gap-6">
            {[["#modules", "Solutions"], ["#pricing", "Pricing"], ["/login", "Sign In"]].map(([href, label]) => (
              <a key={label} href={href} className="text-[13px] font-medium text-gray-500 hover:text-gray-900 transition-colors">{label}</a>
            ))}
          </div>
        </div>
      </motion.footer>

      <SubscriptionDialog isOpen={Boolean(selectedPlan)} plan={selectedPlan} onClose={() => setSelectedPlan(null)} />
    </div>
  );
};

export default LandingPage;
