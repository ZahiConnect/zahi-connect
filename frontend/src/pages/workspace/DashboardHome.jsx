import { useSelector } from "react-redux";
import {
  HiOutlineArchive,
  HiOutlineChartPie,
  HiOutlineClipboardList,
  HiOutlineUsers,
} from "react-icons/hi";
import RestaurantDashboard from "../restaurant/Dashboard";

const workspacePresets = {
  hotel: {
    eyebrow: "Hotel workspace active",
    title: "Your stay operations are live with front desk, pricing, guest, and settings flows.",
    description:
      "This dashboard now carries the merged StayInn-style hotel workspace inside your existing Zahi login and subscription flow.",
    cards: [
      {
        title: "Booking board",
        value: "12 upcoming arrivals",
        detail: "Manual bookings, OTA confirmations, and walk-ins can all live here.",
        icon: HiOutlineClipboardList,
      },
      {
        title: "Room readiness",
        value: "28 rooms tracked",
        detail: "Occupancy, cleaning, maintenance, and block dates can sit in one panel.",
        icon: HiOutlineArchive,
      },
      {
        title: "Pricing control",
        value: "3 seasonal rules",
        detail: "Room rates, weekend surcharges, and nightly overrides are easy to surface.",
        icon: HiOutlineChartPie,
      },
      {
        title: "Guest service layer",
        value: "WhatsApp concierge",
        detail: "Late checkout, pickup, and room requests can route into one owner inbox.",
        icon: HiOutlineUsers,
      },
    ],
  },
  mobility: {
    eyebrow: "Dispatch workspace active",
    title: "Run local rides, fleet visibility, and WhatsApp demand from one board.",
    description:
      "This plan is designed for autos, cabs, and small fleet teams. It gives you the right first layer now, while the real-time driver acceptance flow can deepen in the next sprint.",
    cards: [
      {
        title: "Ride queue",
        value: "7 live requests",
        detail: "Incoming ride demand can appear here from WhatsApp and the public site.",
        icon: HiOutlineClipboardList,
      },
      {
        title: "Driver roster",
        value: "14 available drivers",
        detail: "Track who is online, assigned, or offline without an Uber-sized system.",
        icon: HiOutlineUsers,
      },
      {
        title: "Fleet board",
        value: "9 vehicles listed",
        detail: "Perfect for autos, cabs, and local transport teams starting small.",
        icon: HiOutlineArchive,
      },
      {
        title: "Owner analytics",
        value: "Dispatch snapshot",
        detail: "Trips, payouts, and top-request zones can become your next reporting layer.",
        icon: HiOutlineChartPie,
      },
    ],
  },
};

const DashboardHome = () => {
  const { user } = useSelector((state) => state.auth);

  if (user?.business_type === "restaurant" || user?.role === "super_admin") {
    return <RestaurantDashboard />;
  }

  const preset = workspacePresets[user?.business_type] || workspacePresets.hotel;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="rounded-[30px] border border-[#E7DED5] bg-[linear-gradient(135deg,#FCF7F1_0%,#F4E7D7_58%,#E9D7C7_100%)] p-8 shadow-[0_20px_45px_rgba(117,81,44,0.09)]">
        <span className="inline-flex rounded-full border border-[#D7B89C] bg-white/75 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#9E6041]">
          {preset.eyebrow}
        </span>
        <h1 className="mt-4 max-w-3xl text-4xl font-serif leading-tight text-[#21170F] sm:text-5xl">
          {preset.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#5C4A3C] sm:text-lg">
          {preset.description}
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {preset.cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.title}
              className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1"
            >
              <div className="mb-5 inline-flex rounded-2xl bg-[#F8EFE4] p-3 text-[#A76541]">
                <Icon className="text-2xl" />
              </div>
              <p className="text-sm uppercase tracking-[0.18em] text-[#A76541]">{card.title}</p>
              <h2 className="mt-3 text-2xl font-serif text-[#21170F]">{card.value}</h2>
              <p className="mt-3 text-sm leading-6 text-[#655649]">{card.detail}</p>
            </article>
          );
        })}
      </section>
    </div>
  );
};

export default DashboardHome;
