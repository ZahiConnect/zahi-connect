const createIntl = (options) =>
  new Intl.NumberFormat("en-IN", options);

const currencyFormatter = createIntl({
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const compactFormatter = createIntl({
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

export const FLIGHT_THEME = {
  page: "text-[#15314B]",
  hero:
    "border border-[#C7DBF3] bg-[linear-gradient(135deg,#EEF7FF_0%,#D7E9FB_56%,#B8D6F7_100%)] shadow-[0_24px_54px_rgba(18,72,126,0.12)]",
  card: "border border-[#D9E7F5] bg-white shadow-[0_18px_45px_rgba(15,62,113,0.08)]",
  cardSoft: "border border-[#D9E7F5] bg-[#F8FBFF]",
  border: "border-[#D9E7F5]",
  text: "#15314B",
  accent: "#037FFC",
  accentDark: "#0E4D92",
};

export const DAYS = [
  { value: 1, label: "Mon", short: "M" },
  { value: 2, label: "Tue", short: "T" },
  { value: 3, label: "Wed", short: "W" },
  { value: 4, label: "Thu", short: "T" },
  { value: 5, label: "Fri", short: "F" },
  { value: 6, label: "Sat", short: "S" },
  { value: 7, label: "Sun", short: "S" },
];

export const FLIGHT_STATUSES = [
  { value: "Active", label: "Active", tone: "emerald" },
  { value: "Delayed", label: "Delayed", tone: "amber" },
  { value: "Cancelled", label: "Cancelled", tone: "rose" },
];

export const BOOKING_STATUSES = [
  { value: "Confirmed", label: "Confirmed", tone: "blue" },
  { value: "Checked-In", label: "Checked-In", tone: "indigo" },
  { value: "Boarded", label: "Boarded", tone: "emerald" },
  { value: "Cancelled", label: "Cancelled", tone: "rose" },
];

export const FARE_CLASS_PRESETS = [
  {
    name: "Economy",
    description: "Standard cabin with one carry-on, quick check-in, and flexible add-ons.",
  },
  {
    name: "Business",
    description: "Priority boarding, lounge access, wider seating, and premium meal selection.",
  },
  {
    name: "First",
    description: "Private suites, chauffeur assistance, and the highest baggage allowance.",
  },
];

export const REFERENCE_AIRPORTS = [
  {
    code: "DEL",
    city: "New Delhi",
    country: "India",
    name: "Indira Gandhi International Airport",
  },
  {
    code: "BOM",
    city: "Mumbai",
    country: "India",
    name: "Chhatrapati Shivaji Maharaj International Airport",
  },
  {
    code: "DXB",
    city: "Dubai",
    country: "United Arab Emirates",
    name: "Dubai International Airport",
  },
];

export const REFERENCE_ROUTE_TEMPLATES = [
  {
    flightNumber: "6E-201",
    airlineName: "IndiGo",
    from: "DEL",
    to: "BOM",
    departTime: "06:00",
    arriveTime: "08:15",
    durationMin: 135,
    daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
    aircraftType: "Boeing 737-800",
    totalSeats: 186,
    economySeats: 156,
    businessSeats: 24,
    firstSeats: 6,
    economyPrice: 5400,
    businessPrice: 16800,
    firstPrice: 28600,
    status: "Active",
  },
  {
    flightNumber: "AI-101",
    airlineName: "Air India",
    from: "BOM",
    to: "DXB",
    departTime: "10:30",
    arriveTime: "12:15",
    durationMin: 105,
    daysOfWeek: [1, 3, 5],
    aircraftType: "Airbus A320neo",
    totalSeats: 180,
    economySeats: 132,
    businessSeats: 36,
    firstSeats: 12,
    economyPrice: 12400,
    businessPrice: 28600,
    firstPrice: 48600,
    status: "Active",
  },
];

export const SETTINGS_DEFAULTS = {
  name: "",
  iataCode: "",
  hubAirport: "DEL - New Delhi",
  tagline: "Your aviation workspace, one panel ahead.",
  description: "",
  addr: "",
  phone: "",
  email: "",
  website: "",
  logo: "",
  coverImage: "",
  galleryImages: [],
  supportHours: "24/7 owner desk",
  boardingBufferMinutes: 35,
  checkInOpenHours: 24,
  defaultCurrency: "INR",
  baggagePolicy: "1 cabin bag + 15kg checked baggage in Economy",
  refundPolicy: "Standard fare changes allowed up to 2 hours before departure.",
  alertEmails: "",
};

const AIRPORT_INDEX = Object.fromEntries(
  REFERENCE_AIRPORTS.map((airport) => [airport.code, airport])
);

const safeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const safeString = (value, fallback = "") =>
  typeof value === "string" ? value : value == null ? fallback : String(value);

const normalizeCabinLabel = (value) => {
  const cabin = safeString(value).toLowerCase();
  if (cabin.includes("business")) return "Business";
  if (cabin.includes("first")) return "First";
  return "Economy";
};

const parseBookingSeats = (value) => {
  const values = Array.isArray(value)
    ? value
    : safeString(value).split(/[,/|\s]+/);
  return values
    .map((seat) => safeString(seat).trim().toUpperCase())
    .filter(Boolean)
    .filter((seat, index, seats) => seats.indexOf(seat) === index);
};

export const joinClasses = (...classes) => classes.filter(Boolean).join(" ");

export const formatCurrency = (value) => currencyFormatter.format(safeNumber(value));

export const formatCompactNumber = (value) => compactFormatter.format(safeNumber(value));

export const toDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatDateLabel = (value, options = { day: "numeric", month: "short" }) => {
  if (!value) return "Not scheduled";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-IN", options);
};

export const parseAirportCode = (value = "") => {
  const match = safeString(value).toUpperCase().match(/[A-Z]{3}/);
  return match?.[0] || "";
};

export const getAirport = (value = "") => AIRPORT_INDEX[parseAirportCode(value)] || null;

export const formatAirportLabel = (value = "") => {
  if (!value) return "";
  const normalized = safeString(value).trim();
  if (normalized.includes(" - ")) return normalized;

  const airport = getAirport(normalized);
  if (airport) {
    return `${airport.code} - ${airport.city}`;
  }

  return normalized;
};

export const formatRouteLabel = (from, to) => {
  const fromCode = parseAirportCode(from);
  const toCode = parseAirportCode(to);
  if (fromCode && toCode) {
    return `${fromCode} -> ${toCode}`;
  }
  return [formatAirportLabel(from), formatAirportLabel(to)].filter(Boolean).join(" -> ");
};

export const getOperatingDayValue = (date = new Date()) => {
  const day = new Date(date).getDay();
  return day === 0 ? 7 : day;
};

export const formatOperatingDays = (days = []) => {
  const normalizedDays = [...new Set(days.map((day) => safeNumber(day)).filter(Boolean))];
  if (normalizedDays.length === 7) {
    return "Daily";
  }
  return DAYS.filter((day) => normalizedDays.includes(day.value))
    .map((day) => day.label)
    .join(", ");
};

export const getFlightPriceForClass = (flight, cabinClass = "Economy") => {
  const normalized = safeString(cabinClass).toLowerCase();
  if (normalized.includes("first")) return safeNumber(flight.firstPrice);
  if (normalized.includes("business")) return safeNumber(flight.businessPrice);
  return safeNumber(flight.economyPrice);
};

export const normalizeFlightRecord = (flight, index = 0) => {
  const from = formatAirportLabel(flight.from || flight.origin_iata || "");
  const to = formatAirportLabel(flight.to || flight.destination_iata || "");
  const totalSeats =
    safeNumber(flight.totalSeats) ||
    safeNumber(flight.economySeats) +
      safeNumber(flight.businessSeats) +
      safeNumber(flight.firstSeats) ||
    180;

  return {
    id: flight.id || `flight-${index}`,
    flightNumber: safeString(flight.flightNumber || flight.flight_number || `ZH-${index + 101}`),
    airlineName: safeString(flight.airlineName || flight.airline_name || "Flight Desk"),
    from,
    to,
    originCode: parseAirportCode(from),
    destinationCode: parseAirportCode(to),
    originCity: getAirport(from)?.city || from,
    destinationCity: getAirport(to)?.city || to,
    departTime: safeString(flight.departTime || flight.departure_time || "08:00"),
    arriveTime: safeString(flight.arriveTime || flight.arrival_time || "10:00"),
    durationMin: safeNumber(flight.durationMin || flight.duration_minutes, 120),
    daysOfWeek:
      flight.daysOfWeek?.length || flight.days_of_week?.length
        ? [...(flight.daysOfWeek || flight.days_of_week)].map((day) => safeNumber(day))
        : [1, 2, 3, 4, 5, 6, 7],
    totalSeats,
    economySeats: safeNumber(flight.economySeats, 150),
    businessSeats: safeNumber(flight.businessSeats, 24),
    firstSeats: safeNumber(flight.firstSeats, 6),
    economyPrice: safeNumber(flight.economyPrice, 5400),
    businessPrice: safeNumber(flight.businessPrice, 16800),
    firstPrice: safeNumber(flight.firstPrice, 28600),
    aircraftType: safeString(flight.aircraftType || flight.aircraft_model || "Airbus A320neo"),
    status:
      safeString(flight.status) ||
      (flight.is_active === false ? "Cancelled" : "Active"),
    imageUrl: safeString(flight.imageUrl || flight.image_url || ""),
  };
};

export const normalizeBookingRecord = (booking, index = 0, flights = []) => {
  const linkedFlight = flights.find(
    (flight) => flight.flightNumber === (booking.flightNumber || booking.flight_number)
  );
  const seats = parseBookingSeats(
    booking.seats ||
      booking.seatNumber ||
      booking.seat_number ||
      booking.selectedSeats ||
      booking.selected_seats ||
      booking.metadata?.seats ||
      booking.metadata?.flight_booking?.seats
  );
  const travellers = Math.max(
    1,
    safeNumber(booking.travellers || booking.passengers || booking.passengerCount, 1)
  );
  const cabinClass = normalizeCabinLabel(booking.class || booking.cabinClass || "Economy");
  const amount =
    safeNumber(booking.amount) ||
    getFlightPriceForClass(linkedFlight || {}, cabinClass) * travellers;

  return {
    id: booking.id || `booking-${index}`,
    pnr: safeString(booking.pnr || `PNR${120000 + index}`),
    passengerName: safeString(
      booking.passengerName ||
        booking.passenger_name ||
        booking.lead_passenger ||
        booking.customerName ||
        booking.customer_name ||
        "Guest Passenger"
    ),
    phone: safeString(booking.phone || booking.contact_number || booking.mobile || ""),
    email: safeString(booking.email || booking.customerEmail || booking.customer_email || ""),
    flightNumber: safeString(
      booking.flightNumber || booking.flight_number || linkedFlight?.flightNumber || ""
    ),
    routeLabel: linkedFlight ? formatRouteLabel(linkedFlight.from, linkedFlight.to) : "",
    date: safeString(booking.date || booking.departureDate || toDateInputValue()),
    travellers,
    class: cabinClass,
    status: safeString(booking.status || "Confirmed"),
    amount,
    seats,
    seatNumber: seats.join(", "),
  };
};

export const getLoadFactor = (flight, bookings = []) => {
  const seatsSold = bookings
    .filter(
      (booking) =>
        booking.flightNumber === flight.flightNumber && booking.status !== "Cancelled"
    )
    .reduce((total, booking) => total + safeNumber(booking.travellers, 1), 0);

  return flight.totalSeats ? Math.min(100, Math.round((seatsSold / flight.totalSeats) * 100)) : 0;
};

export const getTodayFlights = (flights = [], date = new Date()) => {
  const dayValue = getOperatingDayValue(date);
  return flights.filter((flight) => (flight.daysOfWeek || []).includes(dayValue));
};

export const buildRoutePerformance = (flights = [], bookings = []) => {
  const routeMap = new Map();

  flights.forEach((flight) => {
    const key = `${flight.originCode || flight.from}-${flight.destinationCode || flight.to}`;
    if (!routeMap.has(key)) {
      routeMap.set(key, {
        id: key,
        routeLabel: formatRouteLabel(flight.from, flight.to),
        from: flight.from,
        to: flight.to,
        sectors: 0,
        activeFlights: 0,
        seats: 0,
        soldSeats: 0,
        revenue: 0,
        averageFare: 0,
        averageLoad: 0,
      });
    }

    const route = routeMap.get(key);
    route.sectors += 1;
    route.activeFlights += flight.status === "Active" ? 1 : 0;
    route.seats += flight.totalSeats;
  });

  bookings.forEach((booking) => {
    const linkedFlight = flights.find((flight) => flight.flightNumber === booking.flightNumber);
    if (!linkedFlight) return;

    const key = `${linkedFlight.originCode || linkedFlight.from}-${
      linkedFlight.destinationCode || linkedFlight.to
    }`;
    const route = routeMap.get(key);
    if (!route) return;

    if (booking.status !== "Cancelled") {
      route.soldSeats += safeNumber(booking.travellers, 1);
      route.revenue += safeNumber(booking.amount);
    }
  });

  return [...routeMap.values()]
    .map((route) => ({
      ...route,
      averageFare: route.soldSeats ? Math.round(route.revenue / route.soldSeats) : 0,
      averageLoad: route.seats ? Math.round((route.soldSeats / route.seats) * 100) : 0,
    }))
    .sort((left, right) => right.revenue - left.revenue || right.soldSeats - left.soldSeats);
};

export const buildPassengerManifest = (bookings = []) => {
  const passengerMap = new Map();

  bookings.forEach((booking) => {
    const key =
      safeString(booking.email).toLowerCase() ||
      safeString(booking.phone) ||
      safeString(booking.passengerName).toLowerCase();

    if (!key) return;

    if (!passengerMap.has(key)) {
      passengerMap.set(key, {
        id: key,
        name: booking.passengerName,
        phone: booking.phone,
        email: booking.email,
        totalFlights: 0,
        totalRevenue: 0,
        latestPnr: booking.pnr,
        latestFlight: booking.flightNumber,
        latestDate: booking.date,
        segments: new Set(),
      });
    }

    const passenger = passengerMap.get(key);
    if (booking.status !== "Cancelled") {
      passenger.totalFlights += safeNumber(booking.travellers, 1) > 1 ? 1 : 1;
      passenger.totalRevenue += safeNumber(booking.amount);
      passenger.segments.add(booking.class);
    }
    if (new Date(booking.date) >= new Date(passenger.latestDate || 0)) {
      passenger.latestPnr = booking.pnr;
      passenger.latestFlight = booking.flightNumber;
      passenger.latestDate = booking.date;
    }
    if (!passenger.phone && booking.phone) passenger.phone = booking.phone;
    if (!passenger.email && booking.email) passenger.email = booking.email;
  });

  return [...passengerMap.values()]
    .map((passenger) => ({
      ...passenger,
      segment:
        passenger.totalFlights >= 5
          ? "Elite"
          : passenger.totalFlights >= 3
            ? "Frequent"
            : "Standard",
      segments: [...passenger.segments],
    }))
    .sort((left, right) => right.totalFlights - left.totalFlights || right.totalRevenue - left.totalRevenue);
};

export const buildStatusBreakdown = (records = [], definitions = BOOKING_STATUSES) =>
  definitions.map((definition) => ({
    ...definition,
    count: records.filter((record) => record.status === definition.value).length,
  }));

export const buildClassMix = (bookings = []) => {
  const totals = {
    Economy: 0,
    Business: 0,
    First: 0,
  };

  bookings.forEach((booking) => {
    const cabin = safeString(booking.class).toLowerCase();
    if (cabin.includes("first")) {
      totals.First += safeNumber(booking.travellers, 1);
      return;
    }
    if (cabin.includes("business")) {
      totals.Business += safeNumber(booking.travellers, 1);
      return;
    }
    totals.Economy += safeNumber(booking.travellers, 1);
  });

  const totalPassengers = Object.values(totals).reduce((sum, value) => sum + value, 0);

  return Object.entries(totals).map(([label, value]) => ({
    label,
    value,
    percentage: totalPassengers ? Math.round((value / totalPassengers) * 100) : 0,
  }));
};

export const buildDayDistribution = (flights = []) =>
  DAYS.map((day) => ({
    ...day,
    count: flights.filter((flight) => (flight.daysOfWeek || []).includes(day.value)).length,
  }));

export const createBookingDraft = (flights = []) => ({
  pnr: `PNR${Math.floor(100000 + Math.random() * 900000)}`,
  passengerName: "",
  phone: "",
  email: "",
  flightNumber: flights[0]?.flightNumber || "",
  date: toDateInputValue(),
  travellers: 1,
  class: "Economy",
  status: "Confirmed",
  amount: flights[0]?.economyPrice || 0,
  seatNumber: "",
});

export const createFlightDraft = (template = REFERENCE_ROUTE_TEMPLATES[0]) => ({
  flightNumber: template?.flightNumber || "",
  airlineName: template?.airlineName || "Zahi Connect",
  from: formatAirportLabel(template?.from || "DEL"),
  to: formatAirportLabel(template?.to || "BOM"),
  departTime: template?.departTime || "08:00",
  arriveTime: template?.arriveTime || "10:00",
  durationMin: template?.durationMin || 120,
  daysOfWeek: template?.daysOfWeek || [1, 2, 3, 4, 5, 6, 7],
  totalSeats: template?.totalSeats || 180,
  economySeats: template?.economySeats || 150,
  businessSeats: template?.businessSeats || 24,
  firstSeats: template?.firstSeats || 6,
  economyPrice: template?.economyPrice || 5400,
  businessPrice: template?.businessPrice || 16800,
  firstPrice: template?.firstPrice || 28600,
  aircraftType: template?.aircraftType || "Airbus A320neo",
  status: template?.status || "Active",
  imageUrl: template?.imageUrl || "",
});

export const getStatusMeta = (definitions, value, fallback = definitions[0]) =>
  definitions.find((definition) => definition.value === value) || fallback;

export const getInitials = (value = "") =>
  safeString(value)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "FL";
