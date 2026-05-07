const getLogoSrc = (markVariant) =>
  `${import.meta.env.BASE_URL}${markVariant === "light" ? "logo.png" : "black_logo.png"}`;

const ZahiLogo = ({
  label = "Zahi Connect",
  tagline,
  markVariant = "dark",
  className = "",
  markClassName = "h-10 w-10 rounded-xl",
  labelClassName = "text-xl font-bold tracking-tight text-[#1A1A1A]",
  taglineClassName = "mt-0.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-400",
}) => (
  <span className={`inline-flex items-center gap-3 ${className}`}>
    <span className={`inline-flex shrink-0 overflow-hidden bg-white ${markClassName}`}>
      <img src={getLogoSrc(markVariant)} alt="" className="h-full w-full object-cover" />
    </span>
    <span className="min-w-0">
      <span className={`block leading-none ${labelClassName}`}>{label}</span>
      {tagline ? <span className={`block ${taglineClassName}`}>{tagline}</span> : null}
    </span>
  </span>
);

export default ZahiLogo;
