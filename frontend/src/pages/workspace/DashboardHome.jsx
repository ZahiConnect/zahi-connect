import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  HiOutlineArrowRight,
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
        route: "/dashboard/bookings",
      },
      {
        title: "Room readiness",
        value: "28 rooms tracked",
        detail: "Occupancy, cleaning, maintenance, and block dates can sit in one panel.",
        icon: HiOutlineArchive,
        route: "/dashboard/rooms",
      },
      {
        title: "Pricing control",
        value: "3 seasonal rules",
        detail: "Room rates, weekend surcharges, and nightly overrides are easy to surface.",
        icon: HiOutlineChartPie,
        route: "/dashboard/pricing",
      },
      {
        title: "Guest service layer",
        value: "WhatsApp concierge",
        detail: "Late checkout, pickup, and room requests can route into one owner inbox.",
        icon: HiOutlineUsers,
        route: "/dashboard/guests",
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
        route: "/dashboard/rides",
      },
      {
        title: "Driver roster",
        value: "14 available drivers",
        detail: "Track who is online, assigned, or offline without an Uber-sized system.",
        icon: HiOutlineUsers,
        route: "/dashboard/drivers",
      },
      {
        title: "Fleet board",
        value: "9 vehicles listed",
        detail: "Perfect for autos, cabs, and local transport teams starting small.",
        icon: HiOutlineArchive,
        route: "/dashboard/fleet",
      },
      {
        title: "Owner analytics",
        value: "Dispatch snapshot",
        detail: "Trips, payouts, and top-request zones can become your next reporting layer.",
        icon: HiOutlineChartPie,
        route: "/dashboard/reports",
      },
    ],
  },
  flight: {
    eyebrow: "Aviation workspace active",
    title: "Your flight operations are live with bookings, schedules, passengers, and settings flows.",
    description:
      "This dashboard carries the airline schedule and PNR management interface inside your existing Zahi login and subscription flow.",
    theme: {
      bg: "bg-[linear-gradient(135deg,#e8f3ff_0%,#d0e6ff_58%,#a0c8fe_100%)]",
      border: "border-[#b0d2ff]",
      shadow: "shadow-[0_20px_45px_rgba(3,127,252,0.09)]",
      badgeBorder: "border-[#037ffc]",
      badgeBg: "bg-white/75",
      badgeText: "text-[#0260c4]",
      titleText: "text-[#022a5e]",
      descText: "text-[#05408a]",
      iconBg: "bg-[#e8f3ff]",
      iconText: "text-[#037ffc]",
      cardTitle: "text-[#037ffc]",
      cardValue: "text-[#022a5e]",
      cardDetail: "text-[#05408a]",
    },
    cards: [
      {
        title: "Reservations",
        value: "Active PNRs",
        detail: "Ticket purchases, seat assignments, and passenger bookings live here.",
        icon: HiOutlineClipboardList,
        route: "/dashboard/flight-bookings",
      },
      {
        title: "Flight Schedule",
        value: "Active Routes",
        detail: "Manage departures, arrivals, frequency, and fleet assignments.",
        icon: HiOutlineArchive,
        route: "/dashboard/flight-schedule",
      },
      {
        title: "Pricing Engine",
        value: "Fare Classes",
        detail: "Economy, Business, and First Class rates dynamically controlled.",
        icon: HiOutlineChartPie,
        route: "/dashboard/flight-pricing",
      },
      {
        title: "Passenger Manifest",
        value: "Clearance Board",
        detail: "Track identity verification, frequent flyers, and boarding limits.",
        icon: HiOutlineUsers,
        route: "/dashboard/flight-passengers",
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
  const theme = preset.theme || {
    bg: "bg-[linear-gradient(135deg,#FCF7F1_0%,#F4E7D7_58%,#E9D7C7_100%)]",
    border: "border-[#E7DED5]",
    shadow: "shadow-[0_20px_45px_rgba(117,81,44,0.09)]",
    badgeBorder: "border-[#D7B89C]",
    badgeBg: "bg-white/75",
    badgeText: "text-[#9E6041]",
    titleText: "text-[#21170F]",
    descText: "text-[#5C4A3C]",
    iconBg: "bg-[#F8EFE4]",
    iconText: "text-[#A76541]",
    cardTitle: "text-[#A76541]",
    cardValue: "text-[#21170F]",
    cardDetail: "text-[#655649]",
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className={`rounded-[30px] border ${theme.border} ${theme.bg} p-8 ${theme.shadow}`}>
        <span className={`inline-flex rounded-full border ${theme.badgeBorder} ${theme.badgeBg} px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${theme.badgeText}`}>
          {preset.eyebrow}
        </span>
        <h1 className={`mt-4 max-w-3xl text-4xl font-serif leading-tight ${theme.titleText} sm:text-5xl`}>
          {preset.title}
        </h1>
        <p className={`mt-4 max-w-2xl text-base leading-7 ${theme.descText} sm:text-lg`}>
          {preset.description}
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {preset.cards.map((card) => {
          const Icon = card.icon;
          const CardTag = card.route ? Link : "article";
          const cardProps = card.route ? { to: card.route } : {};
          return (
            <CardTag
              key={card.title}
              {...cardProps}
              className={`rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1 ${
                card.route ? "group hover:shadow-lg" : ""
              }`}
            >
              <div className={`mb-5 inline-flex rounded-2xl ${theme.iconBg} p-3 ${theme.iconText}`}>
                <Icon className="text-2xl" />
              </div>
              <p className={`text-sm uppercase tracking-[0.18em] ${theme.cardTitle}`}>{card.title}</p>
              <h2 className={`mt-3 text-2xl font-serif ${theme.cardValue}`}>{card.value}</h2>
              <p className={`mt-3 text-sm leading-6 ${theme.cardDetail}`}>{card.detail}</p>
              {card.route ? (
                <div className={`mt-5 inline-flex items-center gap-2 text-sm font-semibold ${theme.cardTitle}`}>
                  Open module
                  <HiOutlineArrowRight className="transition-transform group-hover:translate-x-1" />
                </div>
              ) : null}
            </CardTag>
          );
        })}
      </section>
    </div>
  );
};

export default DashboardHome;
