const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export const formatCurrency = (value) => currencyFormatter.format(Number(value || 0));

export const formatOrderStatus = (status) =>
  String(status || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const orderStatusClasses = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  preparing: "bg-amber-50 text-amber-700 border-amber-200",
  ready: "bg-indigo-50 text-indigo-700 border-indigo-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
};

export const tableStatusClasses = {
  available: "bg-emerald-50 border-emerald-200 text-emerald-700",
  occupied: "bg-amber-50 border-amber-200 text-amber-700",
  reserved: "bg-blue-50 border-blue-200 text-blue-700",
};

export const getRelativeTime = (timestamp) => {
  if (!timestamp) return "Just now";

  const diffMinutes = Math.max(0, Math.round((Date.now() - new Date(timestamp).getTime()) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
};

export const getOrderSourceLabel = (orderType) =>
  String(orderType || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const getFoodTypeLabel = (foodType) =>
  foodType === "non_veg" ? "Non-Veg" : "Veg";
