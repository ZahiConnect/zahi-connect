const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
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
