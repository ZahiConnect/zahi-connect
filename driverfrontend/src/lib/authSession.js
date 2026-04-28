const normalizeOptionalString = (value) => {
  if (typeof value !== "string") return value ?? null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (["null", "undefined", "none"].includes(lower)) {
    return null;
  }

  return trimmed;
};

const normalizeUrlList = (urls = [], fallbackUrl = null) => {
  const values = Array.isArray(urls) ? urls : [];
  const normalized = [fallbackUrl, ...values]
    .map(normalizeOptionalString)
    .filter(Boolean);

  return [...new Set(normalized)];
};

const normalizeVehicle = (vehicle = {}) => ({
  id: vehicle.id ?? null,
  vehicle_name: normalizeOptionalString(vehicle.vehicle_name),
  vehicle_type: normalizeOptionalString(vehicle.vehicle_type) ?? "Cab",
  brand: normalizeOptionalString(vehicle.brand),
  model: normalizeOptionalString(vehicle.model),
  plate_number: normalizeOptionalString(vehicle.plate_number),
  color: normalizeOptionalString(vehicle.color),
  year: vehicle.year ?? null,
  seat_capacity: typeof vehicle.seat_capacity === "number" ? vehicle.seat_capacity : 4,
  air_conditioned: vehicle.air_conditioned !== false,
  photo_url: normalizeOptionalString(vehicle.photo_url),
  rc_image_url: normalizeOptionalString(vehicle.rc_image_url),
  insurance_image_url: normalizeOptionalString(vehicle.insurance_image_url),
  photo_urls: normalizeUrlList(vehicle.photo_urls, vehicle.photo_url),
  rc_image_urls: normalizeUrlList(vehicle.rc_image_urls, vehicle.rc_image_url),
  insurance_image_urls: normalizeUrlList(vehicle.insurance_image_urls, vehicle.insurance_image_url),
  availability_notes: normalizeOptionalString(vehicle.availability_notes),
  base_fare: typeof vehicle.base_fare === "number" ? vehicle.base_fare : 250,
  per_km_rate: typeof vehicle.per_km_rate === "number" ? vehicle.per_km_rate : 18,
});

export const buildSessionDriver = (data = {}) => ({
  id: data.id,
  full_name: data.full_name,
  email: data.email,
  phone: normalizeOptionalString(data.phone),
  profile_photo_url: normalizeOptionalString(data.profile_photo_url),
  aadhaar_number: normalizeOptionalString(data.aadhaar_number),
  aadhaar_image_url: normalizeOptionalString(data.aadhaar_image_url),
  license_number: normalizeOptionalString(data.license_number),
  license_image_url: normalizeOptionalString(data.license_image_url),
  emergency_contact_name: normalizeOptionalString(data.emergency_contact_name),
  emergency_contact_phone: normalizeOptionalString(data.emergency_contact_phone),
  current_area_label: normalizeOptionalString(data.current_area_label),
  current_latitude: data.current_latitude ?? null,
  current_longitude: data.current_longitude ?? null,
  is_online: Boolean(data.is_online),
  is_active: Boolean(data.is_active),
  status: normalizeOptionalString(data.status) ?? "active",
  rating: typeof data.rating === "number" ? data.rating : 0,
  last_seen_at: data.last_seen_at ?? null,
  created_at: data.created_at ?? null,
  vehicle: data.vehicle ? normalizeVehicle(data.vehicle) : null,
});
