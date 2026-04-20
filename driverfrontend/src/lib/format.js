const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

export const formatCurrency = (value) => {
  const amount = Number(value);
  return currencyFormatter.format(Number.isFinite(amount) ? amount : 0);
};

export const formatDateTime = (value) => {
  if (!value) return "Just now";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? String(value) : dateTimeFormatter.format(parsed);
};

export const formatDistance = (value) => {
  const distanceKm = Number(value);
  if (!Number.isFinite(distanceKm)) return "Distance pending";
  if (distanceKm < 1) {
    return `${Math.max(100, Math.round((distanceKm * 1000) / 100) * 100)} m away`;
  }
  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km away`;
  }
  return `${Math.round(distanceKm)} km away`;
};
