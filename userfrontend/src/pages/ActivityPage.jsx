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
  FiPhone,
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
import mobilityService from "../services/mobilityService";

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

const RESTAURANT_ACTIVITY_COPY = {
  sent_to_kitchen: "Your order has been sent to the kitchen.",
  new: "Your order has been sent to the kitchen.",
  preparing: "The kitchen is preparing your order.",
  ready: "Your order is packed and waiting for delivery handoff.",
  ready_for_delivery: "Your order is packed and waiting for delivery handoff.",
  out_for_delivery: "Our delivery person will call you before arriving.",
  served: "Your order has been delivered.",
  delivered: "Your order has been delivered.",
  completed: "Your order is complete.",
  cancelled: "This restaurant order was cancelled.",
};

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
  if (normalized.includes("paid") || normalized.includes("confirm") || normalized.includes("success") || normalized.includes("accepted")) {
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
    const tier = metadata.tier_label ? `${metadata.tier_label} - ` : "";
    const rate = hasValue(metadata.tier_per_km_rate || metadata.tier_fare)
      ? ` @ ${formatCurrency(metadata.tier_per_km_rate || metadata.tier_fare)}/km`
      : "";
    const fare = hasValue(metadata.estimated_fare)
      ? ` - ${formatCurrency(metadata.estimated_fare)}`
      : "";
    return `${tier}${metadata.pickup || "Pickup"} -> ${metadata.drop || "Drop"}${rate}${fare}`;
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
    if (metadata.driver_name) {
      return `${metadata.driver_name}${metadata.driver_phone ? ` - ${metadata.driver_phone}` : ""}`;
    }
    if (metadata.ride_status === "driver_selection_pending") {
      return "Choose a driver";
    }
    if (metadata.requested_driver_name) {
      return `Waiting for ${metadata.requested_driver_name}`;
    }
    return "Waiting for driver acceptance";
  }
  if (request.service_type === "flight") {
    return metadata.airline || request.tenant_name || "Flight booking";
  }
  return request.tenant_name || "Zahi Connect";
};

const extractReference = (request) => {
  const metadata = request.metadata || {};
  return (
    metadata.restaurant_order?.order_id ||
    metadata.hotel_reservation?.reservation_doc_id ||
    metadata.flight_booking?.booking_id ||
    metadata.payment?.razorpay_payment_id ||
    metadata.ride_request_id ||
    request.id
  );
};

const getRestaurantOrderStatus = (request) => {
  if (request.service_type !== "restaurant") return request.status;
  return (
    request.metadata?.restaurant_order?.customer_status ||
    request.metadata?.restaurant_order?.status ||
    request.status
  );
};

const getRestaurantActivityMessage = (request) => {
  const status = String(getRestaurantOrderStatus(request) || "").toLowerCase();
  return RESTAURANT_ACTIVITY_COPY[status] || null;
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
    const restaurantPhone = metadata.restaurant_phone || metadata.tenant_phone || metadata.phone || "";
    sections.push({
      title: "Order details",
      rows: compactRows([
        { label: "Restaurant", value: request.tenant_name },
        { label: "Restaurant contact", value: restaurantPhone },
        { label: "Order note", value: metadata.notes },
        { label: "Delivery info", value: "Our delivery person will call you before arriving." },
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
        { label: "Ride status", value: capitalizeWords(metadata.ride_status || request.status) },
        { label: "Tier", value: metadata.tier_label },
        {
          label: "Tier rate",
          value: hasValue(metadata.tier_per_km_rate || metadata.tier_fare)
            ? `${formatCurrency(metadata.tier_per_km_rate || metadata.tier_fare)}/km`
            : null,
        },
        {
          label: "Trip distance",
          value: hasValue(metadata.trip_distance_km) ? `${metadata.trip_distance_km} km` : null,
        },
        {
          label: "Estimated fare",
          value: hasValue(metadata.estimated_fare) ? formatCurrency(metadata.estimated_fare) : null,
        },
        { label: "Driver", value: metadata.driver_name },
        { label: "Driver phone", value: metadata.driver_phone },
        { label: "Vehicle", value: metadata.vehicle_name },
        { label: "Vehicle color", value: metadata.vehicle_color },
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
              <div class="value">${escapeHtml(String(row.value))}</div>
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

  const deliveryNote = request.service_type === "restaurant"
    ? `<div class="delivery-note">📞 Our delivery person will call you before arriving.${metadata.restaurant_phone || metadata.tenant_phone || metadata.phone ? ` Restaurant contact: <strong>${escapeHtml(metadata.restaurant_phone || metadata.tenant_phone || metadata.phone)}</strong>` : ""}</div>`
    : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(request.title || "Payment receipt")} - Zahi Connect</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: "DM Sans", Arial, Helvetica, sans-serif; color: #1f2937; background: #fff; padding: 20px; font-size: 12px; line-height: 1.5; }
      .sheet { max-width: 720px; margin: 0 auto; }

      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 14px; margin-bottom: 14px; }
      .brand { font-size: 11px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: #ea580c; }
      .header h1 { font-size: 18px; font-weight: 800; margin-top: 4px; }
      .header-right { text-align: right; }
      .header-right .amount { font-size: 22px; font-weight: 900; }
      .header-right .meta { font-size: 10px; color: #667085; margin-top: 2px; }

      .section { margin-top: 12px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 14px; }
      .section-title { font-size: 9px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #ea580c; margin-bottom: 8px; }

      .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 12px; }
      .row { padding: 5px 0; border-bottom: 1px solid #f3f4f6; }
      .row:last-child { border-bottom: 0; }
      .label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #9ca3af; }
      .value { font-size: 12px; font-weight: 600; margin-top: 1px; word-break: break-word; }

      .items-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
      .items-table th { text-align: left; font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #9a3412; background: #fff7ed; padding: 6px 10px; border-bottom: 1px solid #e5e7eb; }
      .items-table td { padding: 5px 10px; border-bottom: 1px solid #f3f4f6; }
      .items-table tr:last-child td { border-bottom: 0; }

      .delivery-note { margin-top: 12px; padding: 10px 14px; border-radius: 10px; background: #eff6ff; border: 1px solid #dbeafe; font-size: 11px; font-weight: 600; color: #1e40af; }

      .footer { margin-top: 14px; text-align: center; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 10px; }

      @media print {
        body { padding: 10px; font-size: 11px; }
        .sheet { max-width: none; }
        .section { break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="header">
        <div>
          <div class="brand">Zahi Connect</div>
          <h1>${escapeHtml(request.title || "Payment receipt")}</h1>
        </div>
        <div class="header-right">
          <div class="amount">${escapeHtml(
            request.total_amount ? formatCurrency(request.total_amount) : "Reserved"
          )}</div>
          <div class="meta">${escapeHtml(capitalizeWords(request.status || "submitted"))} · ${escapeHtml(formatServiceLabel(request.service_type))}</div>
        </div>
      </div>

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

      ${deliveryNote}

      <div class="footer">
        Generated on ${escapeHtml(formatDateTime(new Date().toISOString()))} · Zahi Connect · zahi.in
      </div>
    </div>
    <script>
      window.addEventListener("load", function () {
        window.setTimeout(function () { window.print(); }, 180);
      });
      window.addEventListener("afterprint", function () { window.close(); });
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
  if (request.service_type === "cab") {
    if (request.metadata?.ride_status === "driver_selection_pending" && !request.metadata?.ride_request_id) {
      return `/cabs/select-driver/${request.id}`;
    }
    return "/cabs";
  }
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

const mergeCabRideStatus = (request, ridePayload) => {
  const rideRequest = ridePayload?.ride_request;
  if (!rideRequest) return request;

  const assignedDriver = ridePayload?.assigned_driver || rideRequest.assigned_driver || null;
  const vehicle = assignedDriver?.vehicle || null;
  const metadata = {
    ...(request.metadata || {}),
    ride_status: rideRequest.status || request.metadata?.ride_status || "pending",
    ride_accepted_at: rideRequest.accepted_at || request.metadata?.ride_accepted_at || null,
    requested_driver_id: rideRequest.requested_driver_id || request.metadata?.requested_driver_id || null,
    driver_id: assignedDriver?.id || request.metadata?.driver_id || null,
    driver_name: assignedDriver?.full_name || request.metadata?.driver_name || null,
    driver_phone: assignedDriver?.phone || request.metadata?.driver_phone || null,
    driver_rating: assignedDriver?.rating ?? request.metadata?.driver_rating ?? null,
    vehicle_name: vehicle?.vehicle_name || request.metadata?.vehicle_name || null,
    vehicle_type: vehicle?.vehicle_type || request.metadata?.vehicle_type || null,
    vehicle_brand: vehicle?.brand || request.metadata?.vehicle_brand || null,
    vehicle_model: vehicle?.model || request.metadata?.vehicle_model || null,
    vehicle_color: vehicle?.color || request.metadata?.vehicle_color || null,
    vehicle_photo_url: vehicle?.photo_url || request.metadata?.vehicle_photo_url || null,
    plate_number: vehicle?.plate_number || request.metadata?.plate_number || null,
    tier_key: rideRequest.tier_key || request.metadata?.tier_key || null,
    tier_label: rideRequest.tier_label || request.metadata?.tier_label || null,
    tier_radius_km: rideRequest.tier_radius_km ?? request.metadata?.tier_radius_km ?? null,
    tier_per_km_rate: rideRequest.tier_fare ?? request.metadata?.tier_per_km_rate ?? null,
    tier_fare: rideRequest.tier_fare ?? request.metadata?.tier_fare ?? null,
    trip_distance_km: rideRequest.trip_distance_km ?? request.metadata?.trip_distance_km ?? null,
    estimated_fare: rideRequest.estimated_fare ?? request.metadata?.estimated_fare ?? null,
  };

  const accepted = metadata.ride_status === "accepted" && assignedDriver;
  return {
    ...request,
    status: accepted ? "accepted" : request.status,
    summary: accepted
      ? `Driver accepted - ${assignedDriver.full_name}`
      : request.summary,
    total_amount: metadata.estimated_fare ?? request.total_amount,
    metadata,
  };
};

const hydrateCabRideStatuses = async (items) => {
  const cabRequests = items.filter(
    (request) => request.service_type === "cab" && request.metadata?.ride_request_id
  );

  if (!cabRequests.length) return items;

  const settled = await Promise.all(
    cabRequests.map(async (request) => {
      try {
        const ridePayload = await mobilityService.getRideRequestStatus(request.metadata.ride_request_id);
        return [request.id, mergeCabRideStatus(request, ridePayload)];
      } catch (error) {
        console.error("Failed to hydrate cab ride status", error);
        return [request.id, request];
      }
    })
  );

  const hydratedById = new Map(settled);
  return items.map((request) => hydratedById.get(request.id) || request);
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
          const normalized = Array.isArray(data) ? data : [];
          const hydrated = await hydrateCabRideStatuses(normalized);
          if (active) setRequests(hydrated);
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
    const intervalId = window.setInterval(loadRequests, 5000);

    return () => {
      active = false;
      window.clearInterval(intervalId);
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

                      {request.service_type === "restaurant" && getRestaurantActivityMessage(request) && (
                        <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-100 px-4 py-3 flex items-start gap-2.5">
                          <FiPhone className="mt-0.5 text-blue-500" />
                          <div>
                            <p className="text-xs font-bold text-blue-800">
                              {getRestaurantActivityMessage(request)}
                            </p>
                            {(request.metadata?.restaurant_phone || request.metadata?.tenant_phone || request.metadata?.phone) && (
                              <p className="text-[11px] text-blue-600 mt-1">
                                Restaurant contact:{" "}
                                <span className="font-bold">
                                  {request.metadata.restaurant_phone || request.metadata.tenant_phone || request.metadata.phone}
                                </span>
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {request.service_type === "cab" && (
                        <div className={`mt-4 rounded-2xl border px-4 py-3 ${
                          request.metadata?.driver_name
                            ? "border-green-100 bg-green-50"
                            : "border-amber-100 bg-amber-50"
                        }`}>
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className={`text-xs font-black uppercase tracking-[0.16em] ${
                                request.metadata?.driver_name ? "text-green-700" : "text-amber-700"
                              }`}>
                                {request.metadata?.driver_name
                                  ? "Driver accepted"
                                  : request.metadata?.ride_status === "driver_selection_pending"
                                    ? "Choose driver"
                                    : "Waiting for driver"}
                              </p>
                              {request.metadata?.driver_name ? (
                                <div className="mt-2 space-y-1 text-sm text-gray-700">
                                  <p className="font-bold text-gray-900">{request.metadata.driver_name}</p>
                                  <p>
                                    {request.metadata.vehicle_name || "Vehicle"}{" "}
                                    {request.metadata.plate_number ? `- ${request.metadata.plate_number}` : ""}
                                  </p>
                                  {request.metadata.driver_phone ? (
                                    <p className="font-bold text-green-700">{request.metadata.driver_phone}</p>
                                  ) : null}
                                </div>
                              ) : (
                                <p className="mt-2 text-sm leading-6 text-amber-800">
                                  {request.metadata?.ride_status === "driver_selection_pending"
                                    ? "Payment is complete. Choose a nearby driver to send the request."
                                    : "Payment is complete. Your cab request is waiting in Zahi Driver for acceptance."}
                                </p>
                              )}
                            </div>
                            {request.metadata?.driver_phone ? (
                              <a
                                href={`tel:${request.metadata.driver_phone}`}
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 px-4 py-2.5 text-sm font-bold !text-white visited:!text-white hover:bg-black hover:!text-white focus-visible:!text-white"
                              >
                                <FiPhone />
                                Call driver
                              </a>
                            ) : null}
                          </div>
                        </div>
                      )}
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
