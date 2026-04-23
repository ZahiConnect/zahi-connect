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
  tagline: "",
  description: "",
  propertyType: "",
  featuredAmenities: [],
  coverImage: "",
  galleryImages: [],
  logo: "",
  signature: "",
  invoiceFooter: "",
  mapLink: "",
  latitude: "",
  longitude: "",
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

const normalizeStringArray = (value) =>
  Array.isArray(value)
    ? value
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .filter((item, index, list) => list.indexOf(item) === index)
    : [];

export const mergeHotelSettings = (doc = null) => {
  const source = doc || {};

  return {
    ...DEFAULT_HOTEL_SETTINGS,
    ...source,
    name: source?.name ?? source?.display_name ?? DEFAULT_HOTEL_SETTINGS.name,
    addr: source?.addr ?? source?.address ?? DEFAULT_HOTEL_SETTINGS.addr,
    checkInTime: source?.checkInTime ?? source?.check_in_time ?? DEFAULT_HOTEL_SETTINGS.checkInTime,
    checkOutTime: source?.checkOutTime ?? source?.check_out_time ?? DEFAULT_HOTEL_SETTINGS.checkOutTime,
    propertyType: source?.propertyType ?? source?.property_type ?? DEFAULT_HOTEL_SETTINGS.propertyType,
    coverImage: source?.coverImage ?? source?.cover_image ?? DEFAULT_HOTEL_SETTINGS.coverImage,
    mapLink: source?.mapLink ?? source?.map_link ?? DEFAULT_HOTEL_SETTINGS.mapLink,
    invoiceFooter: source?.invoiceFooter ?? source?.invoice_footer ?? DEFAULT_HOTEL_SETTINGS.invoiceFooter,
    featuredAmenities: normalizeStringArray(
      source?.featuredAmenities ?? source?.featured_amenities
    ),
    galleryImages: normalizeStringArray(
      source?.galleryImages ?? source?.gallery_image_urls
    ),
  };
};

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
