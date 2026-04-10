const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});
const shortDateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
});

export const zahiWhatsAppNumber = "123456782";

export const formatCurrency = (value) => {
  const amount = Number(value);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
};

export const formatAddress = (value) => {
  if (!value) return "Address not added yet";
  return String(value)
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
};

export const shortText = (value, length = 120) => {
  if (!value) return "";
  if (value.length <= length) return value;
  return `${value.slice(0, length).trim()}...`;
};

export const buildWhatsAppLink = (message) =>
  `https://wa.me/${zahiWhatsAppNumber}?text=${encodeURIComponent(message)}`;

export const todayDate = () => new Date().toISOString().slice(0, 10);

export const formatShortDate = (value) => {
  if (!value) return "Date pending";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : shortDateFormatter.format(parsed);
};

export const formatDateRange = (start, end) => {
  if (!start && !end) return "Dates pending";
  if (!end) return formatShortDate(start);
  return `${formatShortDate(start)} - ${formatShortDate(end)}`;
};

export const formatServiceLabel = (serviceType) => {
  switch (serviceType) {
    case "hotel":
      return "Hotels";
    case "restaurant":
      return "Restaurants";
    case "cab":
      return "Cabs";
    case "flight":
      return "Flights";
    default:
      return "Service";
  }
};
