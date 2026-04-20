import { Search, X } from "lucide-react";
import { FLIGHT_THEME, joinClasses } from "../lib/workspace";

const toneClasses = {
  blue: "border-[#BFDAFF] bg-[#EEF6FF] text-[#0E4D92]",
  indigo: "border-[#D8D7FF] bg-[#F1F0FF] text-[#4236B8]",
  emerald: "border-[#CDECDD] bg-[#F1FBF6] text-[#1F7A47]",
  amber: "border-[#F6E0B4] bg-[#FFF7E6] text-[#B76B00]",
  rose: "border-[#F3CDD7] bg-[#FFF2F5] text-[#B33863]",
  slate: "border-[#DDE7F1] bg-[#F7FAFD] text-[#4D6580]",
};

export const FlightWorkspacePage = ({ className = "", children }) => (
  <div className={joinClasses("space-y-6 pb-10", FLIGHT_THEME.page, className)}>{children}</div>
);

export const FlightHero = ({ eyebrow, title, description, stats = [], actions }) => (
  <section className={joinClasses("relative overflow-hidden rounded-[32px] p-8 lg:p-10", FLIGHT_THEME.hero)}>
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -right-14 -top-10 h-44 w-44 rounded-full bg-white/30 blur-3xl" />
      <div className="absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-[#7EB2EA]/20 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.7),transparent_32%),linear-gradient(rgba(255,255,255,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.12)_1px,transparent_1px)] bg-[length:auto,28px_28px,28px_28px]" />
    </div>

    <div className="relative z-10 flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
      <div className="max-w-4xl">
        <span className="inline-flex rounded-full border border-[#6DAEFF] bg-white/70 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0E5EB9]">
          {eyebrow}
        </span>
        <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-tight text-[#14345B] sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#285487] sm:text-lg">{description}</p>
      </div>

      {actions ? <div className="relative z-10 flex flex-wrap gap-3">{actions}</div> : null}
    </div>

    {stats.length ? (
      <div className="relative z-10 mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <MetricCard key={stat.label} {...stat} />
        ))}
      </div>
    ) : null}
  </section>
);

export const MetricCard = ({ label, value, detail, icon: Icon, tone = "blue" }) => (
  <article
    className={joinClasses(
      "rounded-[24px] border p-5 backdrop-blur-sm",
      toneClasses[tone] || toneClasses.blue
    )}
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] opacity-80">{label}</p>
        <h2 className="mt-3 font-serif text-3xl leading-none">{value}</h2>
        {detail ? <p className="mt-3 text-sm leading-6 opacity-85">{detail}</p> : null}
      </div>
      {Icon ? (
        <div className="inline-flex rounded-2xl bg-white/70 p-3">
          <Icon className="text-xl" />
        </div>
      ) : null}
    </div>
  </article>
);

export const FlightPanel = ({ title, description, action, className = "", children }) => (
  <section className={joinClasses("rounded-[28px] p-6 lg:p-7", FLIGHT_THEME.card, className)}>
    {(title || description || action) && (
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          {title ? <h2 className="font-serif text-2xl text-[#163353]">{title}</h2> : null}
          {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-[#55708B]">{description}</p> : null}
        </div>
        {action ? <div className="flex shrink-0 flex-wrap gap-2">{action}</div> : null}
      </div>
    )}
    {children}
  </section>
);

export const FlightButton = ({
  children,
  variant = "primary",
  className = "",
  ...props
}) => {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-transform duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
  const variants = {
    primary: "bg-[#037FFC] text-white shadow-[0_18px_34px_rgba(3,127,252,0.22)] hover:bg-[#056FDC]",
    secondary: "border border-[#C5DAF3] bg-white text-[#123D67] hover:bg-[#F5FAFF]",
    ghost: "border border-transparent bg-[#EEF5FD] text-[#30577E] hover:bg-[#E4EFFA]",
    danger: "border border-[#F2C8D3] bg-[#FFF2F5] text-[#B33863] hover:bg-[#FFE6EC]",
  };

  return (
    <button className={joinClasses(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
};

const fieldBase =
  "w-full rounded-2xl border border-[#D7E5F2] bg-[#F7FBFF] px-4 py-3 text-sm text-[#173453] outline-none transition focus:border-[#7DB4F5] focus:bg-white";

export const FlightInput = ({ className = "", ...props }) => (
  <input className={joinClasses(fieldBase, className)} {...props} />
);

export const FlightSelect = ({ className = "", children, ...props }) => (
  <select className={joinClasses(fieldBase, "appearance-none", className)} {...props}>
    {children}
  </select>
);

export const FlightTextarea = ({ className = "", ...props }) => (
  <textarea className={joinClasses(fieldBase, "min-h-[120px] resize-y", className)} {...props} />
);

export const FlightField = ({ label, hint, required, children }) => (
  <label className="space-y-2">
    {label ? (
      <span className="block text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5F7B96]">
        {label}
        {required ? <span className="ml-1 text-[#B33863]">*</span> : null}
      </span>
    ) : null}
    {children}
    {hint ? <span className="block text-xs text-[#7A90A6]">{hint}</span> : null}
  </label>
);

export const FlightBadge = ({ children, tone = "blue", className = "" }) => (
  <span
    className={joinClasses(
      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
      toneClasses[tone] || toneClasses.blue,
      className
    )}
  >
    {children}
  </span>
);

export const FlightSearchField = ({
  value,
  onChange,
  placeholder = "Search",
  className = "",
}) => (
  <label
    className={joinClasses(
      "relative block min-w-[220px] flex-1",
      className
    )}
  >
    <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#7C94AC]" size={16} />
    <FlightInput
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="pl-11"
    />
  </label>
);

export const FlightEmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}) => (
  <div
    className={joinClasses(
      "rounded-[24px] border border-dashed border-[#C9DCEE] bg-[#F8FBFF] px-6 py-12 text-center",
      className
    )}
  >
    {Icon ? (
      <div className="mx-auto inline-flex rounded-2xl bg-white p-4 text-[#5590CC] shadow-sm">
        <Icon size={26} />
      </div>
    ) : null}
    <h3 className="mt-5 font-serif text-2xl text-[#183757]">{title}</h3>
    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#617D97]">{description}</p>
    {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
  </div>
);

export const ProgressBar = ({ value, tone = "blue" }) => {
  const fills = {
    blue: "bg-[#037FFC]",
    indigo: "bg-[#6156F8]",
    emerald: "bg-[#31B56A]",
    amber: "bg-[#F0A63B]",
    rose: "bg-[#DE527F]",
    slate: "bg-[#8CA6C1]",
  };

  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAF2FA]">
      <div
        className={joinClasses("h-full rounded-full transition-all", fills[tone] || fills.blue)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
};

export const FlightModal = ({
  open,
  title,
  description,
  icon: Icon,
  onClose,
  footer,
  children,
  widthClass = "max-w-4xl",
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A223B]/35 px-4 py-6 backdrop-blur-sm">
      <div className={joinClasses("max-h-[90vh] w-full overflow-hidden rounded-[32px] bg-white shadow-[0_40px_100px_rgba(10,34,59,0.25)]", widthClass)}>
        <div className="flex items-start justify-between gap-4 border-b border-[#E2EDF8] bg-[#F7FBFF] px-6 py-5">
          <div className="flex items-start gap-3">
            {Icon ? (
              <div className="inline-flex rounded-2xl bg-white p-3 text-[#0E5EB9] shadow-sm">
                <Icon size={18} />
              </div>
            ) : null}
            <div>
              <h3 className="font-serif text-2xl text-[#15314B]">{title}</h3>
              {description ? <p className="mt-1 text-sm text-[#617D97]">{description}</p> : null}
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex rounded-full bg-white p-2 text-[#597088] transition hover:bg-[#EDF5FD]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-160px)] overflow-y-auto px-6 py-6">{children}</div>
        {footer ? <div className="border-t border-[#E2EDF8] bg-[#F7FBFF] px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
};
