export const BILL_COLOR_PRESETS = [
  "#F59E0B",
  "#037FFC",
  "#16A34A",
  "#7C3AED",
  "#DC2626",
  "#0F766E",
];

export const DEFAULT_HOTEL_SETTINGS = {
  name: "",
  addr: "",
  phone: "",
  email: "",
  website: "",
  gstin: "",
  checkInTime: "14:00",
  checkOutTime: "11:00",
  logo: "",
  signature: "",
  invoiceFooter: "",
};

export const DEFAULT_CUSTOM_BILL_DEFAULTS = {
  guestName: "",
  guestAddress: "",
  roomLabel: "Accommodation Charges",
  notes: "",
};

export const DEFAULT_BILLING_SETTINGS = {
  gstEnabled: true,
  gstRate: "5",
  invoicePrefix: "INV",
  receiptPrefix: "RCPT",
  cgstLabel: "CGST",
  sgstLabel: "SGST",
  showQr: false,
  dueDays: "0",
  currency: "INR",
  currencySymbol: "₹",
  billColor: BILL_COLOR_PRESETS[0],
  customBillDefaults: { ...DEFAULT_CUSTOM_BILL_DEFAULTS },
};

export const normalizeBillColor = (value) => {
  const color = String(value || "").trim();
  return /^#[0-9A-F]{6}$/i.test(color)
    ? color.toUpperCase()
    : DEFAULT_BILLING_SETTINGS.billColor;
};

export const mergeHotelSettings = (doc = null) => ({
  ...DEFAULT_HOTEL_SETTINGS,
  ...(doc || {}),
});

export const mergeBillingSettings = (doc = null) => {
  const merged = {
    ...DEFAULT_BILLING_SETTINGS,
    ...(doc || {}),
  };

  return {
    ...merged,
    billColor: normalizeBillColor(merged.billColor),
    customBillDefaults: {
      ...DEFAULT_CUSTOM_BILL_DEFAULTS,
      ...(doc?.customBillDefaults || {}),
    },
  };
};

export const toAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

export const formatCurrency = (
  value,
  symbol = DEFAULT_BILLING_SETTINGS.currencySymbol,
) => `${symbol}${toAmount(value).toLocaleString("en-IN")}`;

const pad = (value) => String(value).padStart(2, "0");

export const buildInvoiceId = (
  seq,
  prefix = DEFAULT_BILLING_SETTINGS.invoicePrefix,
  date = new Date(),
) => {
  const safePrefix = String(prefix || DEFAULT_BILLING_SETTINGS.invoicePrefix)
    .trim()
    .toUpperCase();

  return `${safePrefix}-${pad(date.getDate())}${pad(date.getMonth() + 1)}${date.getFullYear()}-${String(seq).padStart(4, "0")}`;
};
