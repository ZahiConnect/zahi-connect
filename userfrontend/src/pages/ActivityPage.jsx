import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FiActivity,
  FiAlertCircle,
  FiArrowRight,
  FiCalendar,
  FiCheckCircle,
  FiClock,
  FiCreditCard,
  FiLayers,
  FiMapPin,
  FiPrinter,
  FiTrendingUp,
} from "react-icons/fi";
import {
  MdOutlineFlight,
  MdOutlineHotel,
  MdOutlineLocalTaxi,
  MdOutlineRestaurant,
} from "react-icons/md";

import {
  formatCurrency,
  formatDateRange,
  formatServiceLabel,
  formatShortDate,
} from "../lib/format";
import bookingService from "../services/bookingService";

const VIEW_TABS = [
  { key: "all", label: "All Activity", icon: FiLayers },
  { key: "active", label: "Active Trips", icon: FiTrendingUp },
  { key: "history", label: "History", icon: FiClock },
];

const SERVICE_FILTERS = [
  { key: "all", label: "All Services", icon: FiActivity },
  { key: "hotel", label: "Hotels", icon: MdOutlineHotel },
  { key: "restaurant", label: "Food", icon: MdOutlineRestaurant },
  { key: "cab", label: "Cabs", icon: MdOutlineLocalTaxi },
  { key: "flight", label: "Flights", icon: MdOutlineFlight },
];

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const toDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const atStartOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const hasValue = (value) => {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
};

const compactRows = (rows) => rows.filter((row) => hasValue(row.value));

const capitalizeWords = (value) =>
  String(value || "")
    .replace(/[_-]+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatDateTime = (value) => {
  if (!value) return "Not available";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : dateTimeFormatter.format(parsed);
};

const formatDurationMinutes = (value) => {
  const minutes = Number(value);
  if (!Number.isFinite(minutes) || minutes <= 0) return null;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours && remainingMinutes) return `${hours}h ${remainingMinutes}m`;
  if (hours) return `${hours}h`;
  return `${remainingMinutes}m`;
};

const getServiceIcon = (serviceType) => {
  switch (serviceType) {
    case "hotel":
      return MdOutlineHotel;
    case "restaurant":
      return MdOutlineRestaurant;
    case "cab":
      return MdOutlineLocalTaxi;
    case "flight":
      return MdOutlineFlight;
    default:
      return FiActivity;
  }
};

const getServiceTheme = (serviceType) => {
  switch (serviceType) {
    case "hotel":
      return {
        badge: "bg-indigo-50 text-indigo-700 border-indigo-100",
        iconWrap: "bg-indigo-50 text-indigo-600",
        action:
          "bg-indigo-600 !text-white visited:!text-white hover:bg-indigo-700 hover:!text-white focus-visible:!text-white shadow-lg shadow-indigo-600/20",
        actionSoft:
          "border border-indigo-100 bg-indigo-50 text-indigo-700 hover:bg-indigo-100",
      };
    case "restaurant":
      return {
        badge: "bg-orange-50 text-orange-700 border-orange-100",
        iconWrap: "bg-orange-50 text-orange-600",
        action:
          "bg-orange-600 !text-white visited:!text-white hover:bg-orange-700 hover:!text-white focus-visible:!text-white shadow-lg shadow-orange-600/20",
        actionSoft:
          "border border-orange-100 bg-orange-50 text-orange-700 hover:bg-orange-100",
      };
    case "cab":
      return {
        badge: "bg-amber-50 text-amber-700 border-amber-100",
        iconWrap: "bg-amber-50 text-amber-600",
        action:
          "bg-amber-500 !text-white visited:!text-white hover:bg-amber-600 hover:!text-white focus-visible:!text-white shadow-lg shadow-amber-500/20",
        actionSoft:
          "border border-amber-100 bg-amber-50 text-amber-700 hover:bg-amber-100",
      };
    case "flight":
      return {
        badge: "bg-sky-50 text-sky-700 border-sky-100",
        iconWrap: "bg-sky-50 text-sky-600",
        action:
          "bg-sky-600 !text-white visited:!text-white hover:bg-sky-700 hover:!text-white focus-visible:!text-white shadow-lg shadow-sky-600/20",
        actionSoft:
          "border border-sky-100 bg-sky-50 text-sky-700 hover:bg-sky-100",
      };
    default:
      return {
        badge: "bg-gray-50 text-gray-700 border-gray-100",
        iconWrap: "bg-gray-50 text-gray-600",
        action:
          "bg-gray-900 !text-white visited:!text-white hover:bg-black hover:!text-white focus-visible:!text-white shadow-lg shadow-gray-900/20",
        actionSoft:
          "border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-100",
      };
  }
};

const getStatusStyles = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("paid") || normalized.includes("confirm") || normalized.includes("success")) {
    return "bg-green-50 text-green-700 border-green-100";
  }
  if (normalized.includes("cancel") || normalized.includes("fail") || normalized.includes("refund")) {
    return "bg-red-50 text-red-700 border-red-100";
  }
  return "bg-orange-50 text-orange-700 border-orange-100";
};

const getEventStart = (request) => {
  const metadata = request.metadata || {};
  if (request.service_type === "hotel") {
    return toDate(
      metadata.check_in ||
        metadata.hotel_reservation?.check_in ||
        metadata.hotel_reservation?.checkIn ||
        request.created_at
    );
  }
  if (request.service_type === "flight") {
    return toDate(metadata.date || metadata.depart_date || request.created_at);
  }
  if (request.service_type === "cab") {
    return toDate(metadata.travel_date || request.created_at);
  }
  if (request.service_type === "restaurant") {
    return toDate(
      metadata.reservation_date ||
        metadata.scheduled_for ||
        metadata.pickup_time ||
        request.created_at
    );
  }
  return toDate(request.created_at);
};

const getEventEnd = (request) => {
  const metadata = request.metadata || {};
  if (request.service_type === "hotel") {
    return toDate(
      metadata.check_out ||
        metadata.hotel_reservation?.check_out ||
        metadata.hotel_reservation?.checkOut ||
        metadata.check_in ||
        request.created_at
    );
  }
  return getEventStart(request);
};

const isHistoricalRequest = (request) => {
  const status = String(request.status || "").toLowerCase();
  if (status.includes("cancel") || status.includes("fail") || status.includes("refund")) {
    return true;
  }

  const today = atStartOfDay(new Date());
  const end = getEventEnd(request);
  if (!end) return false;
  return atStartOfDay(end) < today;
};

const isActiveRequest = (request) => !isHistoricalRequest(request);

const matchesView = (request, activeView) => {
  if (activeView === "history") return isHistoricalRequest(request);
  if (activeView === "active") return isActiveRequest(request);
  return true;
};

const extractTimelineLabel = (request) => {
  const metadata = request.metadata || {};
  if (request.service_type === "hotel") {
    return formatDateRange(
      metadata.check_in || metadata.hotel_reservation?.check_in || metadata.hotel_reservation?.checkIn,
      metadata.check_out || metadata.hotel_reservation?.check_out || metadata.hotel_reservation?.checkOut
    );
  }
  if (request.service_type === "restaurant") {
    return metadata.reservation_date
      ? formatShortDate(metadata.reservation_date)
      : formatShortDate(request.created_at);
  }
  if (request.service_type === "cab") {
    return formatShortDate(metadata.travel_date || request.created_at);
  }
  if (request.service_type === "flight") {
    return formatShortDate(metadata.date || metadata.depart_date || request.created_at);
  }
  return formatShortDate(request.created_at);
};

const extractMetaLine = (request) => {
  const metadata = request.metadata || {};
  if (request.service_type === "hotel") {
    return `${metadata.guests || 1} guest(s) - ${metadata.room_type || metadata.preferred_room_type || "Room reserved"}`;
  }
  if (request.service_type === "restaurant") {
    return `${metadata.items?.length || 0} item(s) - ${metadata.diners || 1} diner(s)`;
  }
  if (request.service_type === "cab") {
    return `${metadata.pickup || "Pickup"} -> ${metadata.drop || "Drop"}`;
  }
  if (request.service_type === "flight") {
    const origin = metadata.origin_code || metadata.origin || "Origin";
    const destination = metadata.destination_code || metadata.destination || "Destination";
    return `${origin} -> ${destination} - ${metadata.passengers || 1} passenger(s)`;
  }
  return request.summary || "Booking recorded";
};

const extractLocationLine = (request) => {
  const metadata = request.metadata || {};
  if (request.service_type === "hotel") {
    return metadata.hotel_address || request.tenant_name || "Hotel booking";
  }
  if (request.service_type === "restaurant") {
    return request.tenant_name || "Restaurant order";
  }
  if (request.service_type === "cab") {
    return metadata.driver_name
      ? `${metadata.driver_name}${metadata.vehicle_name ? ` - ${metadata.vehicle_name}` : ""}`
      : "Ride request saved";
  }
  if (request.service_type === "flight") {
    return metadata.airline || request.tenant_name || "Flight booking";
  }
  return request.tenant_name || "Zahi Connect";
};

const extractReference = (request) => {
  const metadata = request.metadata || {};
  return (
    metadata.hotel_reservation?.reservation_doc_id ||
    metadata.flight_booking?.booking_id ||
    metadata.payment?.razorpay_payment_id ||
    metadata.ride_request_id ||
    request.id
  );
};

const hasPaymentDetails = (request) => {
  const payment = request.metadata?.payment;
  return Boolean(payment?.provider || payment?.razorpay_payment_id || payment?.razorpay_order_id);
};

const buildPrintSections = (request) => {
  const metadata = request.metadata || {};
  const payment = metadata.payment || {};
  const sections = [
    {
      title: "Payment details",
      rows: compactRows([
        { label: "Booking title", value: request.title || "Booking" },
        { label: "Service", value: formatServiceLabel(request.service_type) },
        { label: "Booking status", value: capitalizeWords(request.status || "submitted") },
        {
          label: "Amount paid",
          value: request.total_amount ? formatCurrency(request.total_amount) : "Reserved",
        },
        { label: "Currency", value: request.currency || "INR" },
        { label: "Payment provider", value: capitalizeWords(payment.provider) },
        { label: "Payment status", value: capitalizeWords(payment.status || request.status) },
        { label: "Razorpay order ID", value: payment.razorpay_order_id },
        { label: "Razorpay payment ID", value: payment.razorpay_payment_id },
        { label: "Booking reference", value: extractReference(request) },
        { label: "Booked on", value: formatDateTime(request.created_at) },
        { label: "Generated on", value: formatDateTime(new Date().toISOString()) },
      ]),
    },
    {
      title: "Booking overview",
      rows: compactRows([
        { label: "Merchant", value: request.tenant_name || "Zahi Connect" },
        { label: "Timeline", value: extractTimelineLabel(request) },
        { label: "Location", value: extractLocationLine(request) },
        { label: "Details", value: extractMetaLine(request) },
        { label: "Summary", value: request.summary },
      ]),
    },
  ];

  if (request.user_name || request.user_email) {
    sections.push({
      title: "Customer",
      rows: compactRows([
        { label: "Customer name", value: request.user_name },
        { label: "Customer email", value: request.user_email },
      ]),
    });
  }

  if (request.service_type === "hotel") {
    sections.push({
      title: "Stay details",
      rows: compactRows([
        { label: "Check in", value: metadata.check_in },
        { label: "Check out", value: metadata.check_out },
        { label: "Guests", value: metadata.guests },
        { label: "Nights", value: metadata.nights },
        { label: "Room type", value: metadata.room_type || metadata.preferred_room_type },
        { label: "Room number", value: metadata.selected_room_number },
        { label: "Room floor", value: metadata.selected_room_floor },
        { label: "Room mode", value: metadata.room_mode || metadata.selected_room_mode },
        {
          label: "Nightly rate",
          value: hasValue(metadata.nightly_rate) ? formatCurrency(metadata.nightly_rate) : null,
        },
        { label: "Guest name", value: metadata.guest_name },
        { label: "Guest phone", value: metadata.guest_phone },
        { label: "Hotel address", value: metadata.hotel_address },
        { label: "Check in time", value: metadata.check_in_time },
        { label: "Check out time", value: metadata.check_out_time },
        { label: "Special requests", value: metadata.special_requests },
      ]),
    });
  }

  if (request.service_type === "restaurant") {
    sections.push({
      title: "Order details",
      rows: compactRows([
        { label: "Restaurant", value: request.tenant_name },
        { label: "Diners", value: metadata.diners },
        { label: "Order note", value: metadata.notes },
      ]),
    });
  }

  if (request.service_type === "cab") {
    sections.push({
      title: "Ride details",
      rows: compactRows([
        { label: "Pickup", value: metadata.pickup },
        { label: "Drop", value: metadata.drop },
        { label: "Travel date", value: metadata.travel_date },
        { label: "Passengers", value: metadata.passengers },
        {
          label: "Estimated fare",
          value: hasValue(metadata.estimated_fare) ? formatCurrency(metadata.estimated_fare) : null,
        },
        { label: "Driver", value: metadata.driver_name },
        { label: "Driver phone", value: metadata.driver_phone },
        { label: "Vehicle", value: metadata.vehicle_name },
        { label: "Plate number", value: metadata.plate_number },
        { label: "Ride note", value: metadata.notes },
      ]),
    });
  }

  if (request.service_type === "flight") {
    sections.push({
      title: "Flight details",
      rows: compactRows([
        { label: "Airline", value: metadata.airline },
        { label: "Flight number", value: metadata.flight_number },
        {
          label: "Route",
          value: compactRows([
            { value: metadata.origin_code || metadata.origin },
            { value: metadata.destination_code || metadata.destination },
          ]).length
            ? `${metadata.origin_code || metadata.origin || "Origin"} -> ${
                metadata.destination_code || metadata.destination || "Destination"
              }`
            : null,
        },
        { label: "Travel date", value: metadata.date || metadata.depart_date },
        { label: "Departure time", value: metadata.departure_time },
        { label: "Arrival time", value: metadata.arrival_time },
        { label: "Class", value: capitalizeWords(metadata.class) },
        { label: "Passengers", value: metadata.passengers },
        { label: "Lead passenger", value: metadata.lead_passenger },
        { label: "Contact number", value: metadata.contact_number },
        { label: "Seats", value: metadata.seats },
        { label: "Aircraft", value: metadata.aircraft },
        { label: "Duration", value: formatDurationMinutes(metadata.duration) },
      ]),
    });
  }

  return sections.filter((section) => section.rows.length > 0);
};

const renderPrintSection = (section) => `
  <section class="section">
    <div class="section-title">${escapeHtml(section.title)}</div>
    <div class="grid">
      ${section.rows
        .map(
          (row) => `
            <div class="row">
              <div class="label">${escapeHtml(row.label)}</div>
              <div class="value">${escapeHtml(row.value)}</div>
            </div>
          `
        )
        .join("")}
    </div>
  </section>
`;

const buildPrintMarkup = (request) => {
  const metadata = request.metadata || {};
  const sections = buildPrintSections(request);
  const restaurantItems = Array.isArray(metadata.items) ? metadata.items : [];

  const itemRows = restaurantItems
    .map((item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = hasValue(item.unit_price) ? formatCurrency(item.unit_price) : "-";
      const lineTotal = hasValue(item.total) ? formatCurrency(item.total) : "-";

      return `
        <tr>
          <td>${escapeHtml(item.name || "Item")}</td>
          <td>${escapeHtml(quantity || "-")}</td>
          <td>${escapeHtml(unitPrice)}</td>
          <td>${escapeHtml(lineTotal)}</td>
        </tr>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(request.title || "Payment details")} - Print</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #1f2937;
        --muted: #667085;
        --line: #e5e7eb;
        --soft: #f8fafc;
        --brand: #ea580c;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 32px;
        font-family: "DM Sans", Arial, sans-serif;
        color: var(--ink);
        background: white;
      }

      .sheet {
        max-width: 880px;
        margin: 0 auto;
      }

      .hero {
        display: flex;
        justify-content: space-between;
        gap: 24px;
        align-items: flex-start;
        padding: 24px 28px;
        border: 1px solid var(--line);
        border-radius: 24px;
        background: linear-gradient(135deg, #fff7ed 0%, #ffffff 58%, #eff6ff 100%);
      }

      .brand {
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.22em;
        text-transform: uppercase;
        color: var(--brand);
      }

      h1 {
        margin: 12px 0 8px;
        font-size: 30px;
        line-height: 1.15;
      }

      .subtitle {
        margin: 0;
        color: var(--muted);
        line-height: 1.7;
        max-width: 56ch;
      }

      .summary-card {
        min-width: 220px;
        border-radius: 20px;
        padding: 18px 20px;
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(229, 231, 235, 0.95);
      }

      .summary-card .eyebrow,
      .section-title,
      .label {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .summary-card .eyebrow,
      .label {
        color: var(--muted);
      }

      .summary-card .amount {
        margin-top: 10px;
        font-size: 28px;
        font-weight: 900;
      }

      .meta {
        margin-top: 8px;
        color: var(--muted);
        font-size: 13px;
      }

      .section {
        margin-top: 22px;
        border: 1px solid var(--line);
        border-radius: 22px;
        padding: 20px 22px;
      }

      .section-title {
        color: var(--brand);
        margin-bottom: 16px;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 14px 18px;
      }

      .row {
        padding: 14px 16px;
        border-radius: 16px;
        background: var(--soft);
        border: 1px solid #eef2f7;
      }

      .value {
        margin-top: 8px;
        font-size: 15px;
        font-weight: 700;
        line-height: 1.55;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .items-table {
        width: 100%;
        border-collapse: collapse;
        overflow: hidden;
        border-radius: 18px;
        border: 1px solid var(--line);
      }

      .items-table th,
      .items-table td {
        padding: 14px 16px;
        text-align: left;
        border-bottom: 1px solid var(--line);
        font-size: 14px;
      }

      .items-table th {
        background: #fff7ed;
        color: #9a3412;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .items-table tr:last-child td {
        border-bottom: 0;
      }

      .mono {
        font-family: "Courier New", monospace;
      }

      @media print {
        body {
          padding: 0;
        }

        .sheet {
          max-width: none;
        }

        .section,
        .hero {
          break-inside: avoid;
        }
      }

      @media (max-width: 720px) {
        body {
          padding: 20px;
        }

        .hero {
          flex-direction: column;
        }

        .summary-card {
          width: 100%;
          min-width: 0;
        }

        .grid {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <header class="hero">
        <div>
          <div class="brand">Zahi Connect</div>
          <h1>${escapeHtml(request.title || "Payment details")}</h1>
          <p class="subtitle">${escapeHtml(
            request.summary || "Printable payment confirmation for your booking activity."
          )}</p>
        </div>
        <aside class="summary-card">
          <div class="eyebrow">Payment amount</div>
          <div class="amount">${escapeHtml(
            request.total_amount ? formatCurrency(request.total_amount) : "Reserved"
          )}</div>
          <div class="meta">
            ${escapeHtml(capitalizeWords(request.status || "submitted"))}<br />
            ${escapeHtml(formatServiceLabel(request.service_type))}
          </div>
        </aside>
      </header>

      ${sections.map((section) => renderPrintSection(section)).join("")}

      ${
        itemRows
          ? `
            <section class="section">
              <div class="section-title">Order items</div>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>
            </section>
          `
          : ""
      }
    </div>
    <script>
      window.addEventListener("load", function () {
        window.setTimeout(function () {
          window.print();
        }, 180);
      });

      window.addEventListener("afterprint", function () {
        window.close();
      });
    </script>
  </body>
</html>`;
};

const getCtaLink = (request) => {
  if (request.service_type === "hotel" && request.tenant_slug) {
    return `/hotels/${request.tenant_slug}`;
  }
  if (request.service_type === "restaurant" && request.tenant_slug) {
    return `/restaurants/${request.tenant_slug}`;
  }
  if (request.service_type === "cab") return "/cabs";
  if (request.service_type === "flight") return "/flights";
  return null;
};

const sortRequests = (items, activeView) => {
  return [...items].sort((left, right) => {
    if (activeView === "active") {
      const leftStart = getEventStart(left)?.getTime() ?? new Date(left.created_at).getTime();
      const rightStart = getEventStart(right)?.getTime() ?? new Date(right.created_at).getTime();
      return leftStart - rightStart;
    }

    const leftCreated = new Date(left.created_at).getTime();
    const rightCreated = new Date(right.created_at).getTime();
    return rightCreated - leftCreated;
  });
};

const ActivityPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");

  useEffect(() => {
    let active = true;

    const loadRequests = async () => {
      try {
        const data = await bookingService.getRequests();
        if (active) {
          setRequests(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load booking activity", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadRequests();
    return () => {
      active = false;
    };
  }, []);

  const visibleRequests = useMemo(() => {
    const filtered = requests.filter((request) => {
      const matchesService = serviceFilter === "all" || request.service_type === serviceFilter;
      return matchesService && matchesView(request, activeView);
    });

    return sortRequests(filtered, activeView);
  }, [activeView, requests, serviceFilter]);

  const stats = useMemo(() => {
    const spend = requests.reduce((total, request) => total + (Number(request.total_amount) || 0), 0);
    const paidCount = requests.filter((request) => {
      const status = String(request.status || "").toLowerCase();
      return status.includes("paid") || status.includes("confirm") || status.includes("success");
    }).length;
    const activeCount = requests.filter((request) => isActiveRequest(request)).length;

    return {
      total: requests.length,
      paid: paidCount,
      active: activeCount,
      spend,
    };
  }, [requests]);

  const tabCounts = useMemo(() => ({
    all: requests.length,
    active: requests.filter((request) => isActiveRequest(request)).length,
    history: requests.filter((request) => isHistoricalRequest(request)).length,
  }), [requests]);

  const serviceCounts = useMemo(() => {
    const counts = {
      all: requests.length,
      hotel: 0,
      restaurant: 0,
      cab: 0,
      flight: 0,
    };

    requests.forEach((request) => {
      if (counts[request.service_type] !== undefined) {
        counts[request.service_type] += 1;
      }
    });

    return counts;
  }, [requests]);

  const handlePrintPaymentDetails = (request) => {
    if (!hasPaymentDetails(request)) return;

    const printWindow = window.open("", "_blank", "width=960,height=720");
    if (!printWindow) return;

    printWindow.document.open();
    printWindow.document.write(buildPrintMarkup(request));
    printWindow.document.close();
  };

  return (
    <div className="space-y-8">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <FiTrendingUp className="text-xl" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Active now</p>
              <p className="text-2xl font-black text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-50 text-green-600">
              <FiCheckCircle className="text-xl" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Paid bookings</p>
              <p className="text-2xl font-black text-gray-900">{stats.paid}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <FiCreditCard className="text-xl" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Total spend</p>
              <p className="text-2xl font-black text-gray-900">{formatCurrency(stats.spend)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-gray-100 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            {VIEW_TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeView === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveView(tab.key)}
                  className={`inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-all ${
                    active
                      ? "bg-gray-900 text-white shadow-lg shadow-gray-900/10"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="text-base" />
                  {tab.label}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    active ? "bg-white/15 text-white" : "bg-white text-gray-500"
                  }`}>
                    {tabCounts[tab.key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            {SERVICE_FILTERS.map((filter) => {
              const Icon = filter.icon;
              const active = serviceFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setServiceFilter(filter.key)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-black uppercase tracking-[0.16em] transition-all ${
                    active
                      ? "border-orange-200 bg-orange-50 text-orange-700"
                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                >
                  <Icon className="text-base" />
                  {filter.label}
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-[9px] text-inherit">
                    {serviceCounts[filter.key]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {loading ? (
          [...Array(4)].map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-[30px] border border-gray-100 bg-gray-50"
            />
          ))
        ) : visibleRequests.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-gray-200 bg-white px-6 py-16 text-center shadow-sm">
            <FiAlertCircle className="mx-auto text-5xl text-gray-200" />
            <h2 className="mt-6 text-2xl font-black text-gray-900">No bookings in this view yet</h2>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-gray-500">
              Try switching the top tabs or service filters, or make a new booking from hotels,
              food, cabs, or flights.
            </p>
            <Link
              to="/hotels"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-bold !text-white visited:!text-white hover:bg-black hover:!text-white focus-visible:!text-white transition-all"
            >
              Explore bookings
              <FiArrowRight />
            </Link>
          </div>
        ) : (
          visibleRequests.map((request, index) => {
            const Icon = getServiceIcon(request.service_type);
            const theme = getServiceTheme(request.service_type);
            const ctaLink = getCtaLink(request);
            const reference = extractReference(request);
            const showPrintButton = hasPaymentDetails(request);

            return (
              <motion.article
                key={request.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.04, 0.2) }}
                className="rounded-[32px] border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-gray-900/5 sm:p-7"
              >
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex gap-4">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${theme.iconWrap}`}>
                      <Icon className="text-2xl" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${theme.badge}`}>
                          {formatServiceLabel(request.service_type)}
                        </span>
                        <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${getStatusStyles(request.status)}`}>
                          {capitalizeWords(request.status || "submitted")}
                        </span>
                      </div>

                      <h2 className="mt-3 text-2xl font-black text-gray-900">{request.title}</h2>
                      <p className="mt-2 text-sm leading-7 text-gray-500">
                        {request.summary || extractMetaLine(request)}
                      </p>

                      <div className="mt-5 grid gap-3 text-sm text-gray-500 sm:grid-cols-2">
                        <div className="flex items-center gap-2">
                          <FiCalendar className="text-gray-400" />
                          <span>{extractTimelineLabel(request)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiMapPin className="text-gray-400" />
                          <span className="truncate">{extractLocationLine(request)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiActivity className="text-gray-400" />
                          <span className="truncate">{extractMetaLine(request)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiClock className="text-gray-400" />
                          <span>Booked on {formatShortDate(request.created_at)}</span>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <span className="rounded-full bg-gray-50 px-3 py-1.5 text-[11px] font-bold text-gray-600">
                          Ref: {String(reference).slice(0, 18)}
                        </span>
                        {request.metadata?.payment?.provider ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1.5 text-[11px] font-bold text-green-700">
                            <FiCreditCard />
                            Payment {capitalizeWords(request.metadata.payment.status || "confirmed")}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex min-w-[180px] flex-col gap-4 rounded-[24px] bg-gray-50 p-5 lg:items-end">
                    <div className="w-full lg:text-right">
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-gray-400">
                        Booking amount
                      </p>
                      <p className="mt-2 text-2xl font-black text-gray-900">
                        {request.total_amount ? formatCurrency(request.total_amount) : "Reserved"}
                      </p>
                    </div>

                    <div className="flex w-full flex-wrap gap-2 lg:justify-end">
                      {showPrintButton ? (
                        <button
                          type="button"
                          onClick={() => handlePrintPaymentDetails(request)}
                          className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${theme.actionSoft}`}
                        >
                          <FiPrinter />
                          Print
                        </button>
                      ) : null}

                      {ctaLink ? (
                        <Link
                          to={ctaLink}
                          className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${theme.action}`}
                        >
                          Open
                          <FiArrowRight />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })
        )}
      </section>
    </div>
  );
};

export default ActivityPage;
