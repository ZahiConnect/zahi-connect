import {
  HiOutlineClock,
  HiOutlineLocationMarker,
  HiOutlineMail,
  HiOutlinePhone,
} from "react-icons/hi";

export const inputClassName =
  "w-full rounded-2xl border border-[#E4D8CC] bg-white px-4 py-3 text-sm text-[#21170F] outline-none transition focus:border-[#B97954]";

export const serviceModes = [
  { id: "dine_in", label: "Dine in" },
  { id: "takeaway", label: "Takeaway" },
  { id: "delivery", label: "Delivery" },
];

export const priceBands = [
  { value: "budget", label: "Budget" },
  { value: "mid_range", label: "Mid range" },
  { value: "premium", label: "Premium" },
];

export const buildGeneralForm = (settings) => ({
  name: settings?.tenant?.name || "",
  email: settings?.tenant?.email || "",
  phone: settings?.tenant?.phone || "",
  address: settings?.tenant?.address || "",
  tagline: settings?.profile?.tagline || "",
  description: settings?.profile?.description || "",
  area_name: settings?.profile?.area_name || "",
  city: settings?.profile?.city || "",
  state: settings?.profile?.state || "",
  postal_code: settings?.profile?.postal_code || "",
  map_link: settings?.profile?.map_link || "",
  latitude: settings?.profile?.latitude ?? "",
  longitude: settings?.profile?.longitude ?? "",
  contact_email: settings?.profile?.contact_email || "",
  reservation_phone: settings?.profile?.reservation_phone || "",
  whatsapp_number: settings?.profile?.whatsapp_number || "",
});

export const buildOperationsForm = (settings) => ({
  service_modes: settings?.profile?.service_modes?.length
    ? settings.profile.service_modes
    : ["dine_in", "takeaway"],
  cuisine_tags: (settings?.profile?.cuisine_tags || []).join(", "),
  opening_time: settings?.profile?.opening_time || "09:00",
  closing_time: settings?.profile?.closing_time || "22:00",
  average_prep_minutes: settings?.profile?.average_prep_minutes || 20,
  seating_capacity: settings?.profile?.seating_capacity || "",
  price_band: settings?.profile?.price_band || "mid_range",
  accepts_reservations: Boolean(settings?.profile?.accepts_reservations ?? true),
});

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-[#4E4034]">{label}</span>
      {children}
    </label>
  );
}

export function RestaurantSettingsShell({ sectionLabel, title, description, settings, children }) {
  const galleryImages = settings?.profile?.gallery_image_urls || [];
  const locationLine = [
    settings?.profile?.area_name,
    settings?.profile?.city,
    settings?.profile?.state,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <section className="overflow-hidden rounded-[30px] border border-[#E6DDD4] bg-[linear-gradient(135deg,#FCF6EF_0%,#F3E4D4_52%,#E8D1BA_100%)] p-8 shadow-[0_20px_40px_rgba(118,78,44,0.08)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-white/60 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#9A5E3D]">
              {sectionLabel}
            </span>
            <h1 className="mt-5 text-4xl font-serif text-[#21170F] sm:text-5xl">{title}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#5C4A3C]">{description}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#9C7A61]">Public slug</p>
              <p className="mt-2 text-sm font-semibold text-[#221812]">/{settings?.tenant?.slug}</p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#9C7A61]">Service modes</p>
              <p className="mt-2 text-sm font-semibold capitalize text-[#221812]">
                {(settings?.profile?.service_modes || []).join(", ").replaceAll("_", " ")}
              </p>
            </div>
            <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#9C7A61]">Images</p>
              <p className="mt-2 text-sm font-semibold text-[#221812]">{galleryImages.length} uploaded</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.28fr_0.72fr]">
        <section className="rounded-[30px] border border-[#E9DED2] bg-white p-6 shadow-sm">
          {children}
        </section>

        <aside className="space-y-4">
          <div className="rounded-[30px] border border-[#E9DED2] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A5E3D]">
              Customer-facing preview
            </p>
            <h2 className="mt-3 text-3xl font-serif text-[#201711]">{settings?.tenant?.name}</h2>
            <p className="mt-3 text-sm leading-7 text-[#6D5A4B]">
              {settings?.profile?.tagline || "Add a tagline to give customers a cleaner first impression."}
            </p>

            <div className="mt-6 space-y-3 text-sm text-[#5D4A3C]">
              <div className="rounded-2xl bg-[#FBF6F0] px-4 py-4">
                <p className="inline-flex items-center gap-2 font-semibold text-[#201711]">
                  <HiOutlineLocationMarker className="text-[#A5633D]" />
                  {locationLine || settings?.tenant?.address || "Location pending"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#FBF6F0] px-4 py-4">
                <p className="inline-flex items-center gap-2 font-semibold text-[#201711]">
                  <HiOutlineMail className="text-[#A5633D]" />
                  {settings?.profile?.contact_email || settings?.tenant?.email}
                </p>
              </div>
              <div className="rounded-2xl bg-[#FBF6F0] px-4 py-4">
                <p className="inline-flex items-center gap-2 font-semibold text-[#201711]">
                  <HiOutlinePhone className="text-[#A5633D]" />
                  {settings?.profile?.reservation_phone || settings?.tenant?.phone || "Reservation line pending"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#FBF6F0] px-4 py-4">
                <p className="inline-flex items-center gap-2 font-semibold text-[#201711]">
                  <HiOutlineClock className="text-[#A5633D]" />
                  {(settings?.profile?.opening_time || "09:00") +
                    " to " +
                    (settings?.profile?.closing_time || "22:00")}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[30px] border border-[#E9DED2] bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9A5E3D]">
              Operations snapshot
            </p>
            <div className="mt-5 space-y-4 text-sm text-[#5D4A3C]">
              <div className="rounded-2xl bg-[#FBF6F0] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#9C7A61]">Service modes</p>
                <p className="mt-2 font-semibold capitalize text-[#201711]">
                  {(settings?.profile?.service_modes || []).join(", ").replaceAll("_", " ")}
                </p>
              </div>
              <div className="rounded-2xl bg-[#FBF6F0] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#9C7A61]">Cuisine tags</p>
                <p className="mt-2 font-semibold text-[#201711]">
                  {settings?.profile?.cuisine_tags?.length
                    ? settings.profile.cuisine_tags.join(", ")
                    : "Add cuisine tags in operations"}
                </p>
              </div>
              <div className="rounded-2xl bg-[#FBF6F0] px-4 py-4">
                <p className="text-xs uppercase tracking-[0.18em] text-[#9C7A61]">Prep and seating</p>
                <p className="mt-2 font-semibold text-[#201711]">
                  {(settings?.profile?.average_prep_minutes || 20) + " mins prep"}
                  {settings?.profile?.seating_capacity
                    ? ` | ${settings.profile.seating_capacity} seats`
                    : " | Seating not set"}
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
