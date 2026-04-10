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

export const toCoordinateNumber = (value) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
};

export const calculateDistanceKm = (fromCoordinates, toCoordinates) => {
  const fromLatitude = toCoordinateNumber(fromCoordinates?.latitude);
  const fromLongitude = toCoordinateNumber(fromCoordinates?.longitude);
  const toLatitude = toCoordinateNumber(toCoordinates?.latitude);
  const toLongitude = toCoordinateNumber(toCoordinates?.longitude);

  if ([fromLatitude, fromLongitude, toLatitude, toLongitude].some((value) => value === null)) {
    return null;
  }

  const earthRadiusKm = 6371;
  const deltaLatitude = ((toLatitude - fromLatitude) * Math.PI) / 180;
  const deltaLongitude = ((toLongitude - fromLongitude) * Math.PI) / 180;
  const haversine =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos((fromLatitude * Math.PI) / 180) *
      Math.cos((toLatitude * Math.PI) / 180) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);
  const distance =
    2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return Number.isFinite(distance) ? Number(distance.toFixed(2)) : null;
};

export const formatDistance = (value) => {
  const distanceKm = Number(value);
  if (!Number.isFinite(distanceKm)) return "Distance unavailable";
  if (distanceKm < 1) {
    return `${Math.max(100, Math.round(distanceKm * 1000 / 100) * 100)} m away`;
  }
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km away`;
  }
  return `${Math.round(distanceKm)} km away`;
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
