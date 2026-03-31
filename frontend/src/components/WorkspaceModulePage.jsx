const WorkspaceModulePage = ({
  eyebrow,
  title,
  description,
  highlights = [],
  primaryLabel,
  secondaryLabel,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="relative overflow-hidden rounded-[28px] border border-[#E6DDD4] bg-[linear-gradient(135deg,#FAF5EF_0%,#F3E7D7_55%,#EBD7C1_100%)] p-8 shadow-[0_18px_40px_rgba(120,84,50,0.08)]">
        <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-[#D97757]/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-[#8C9A6D]/15 blur-3xl" />

        <div className="relative max-w-3xl space-y-4">
          <span className="inline-flex rounded-full border border-[#D4B89D] bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#9A5E3D]">
            {eyebrow}
          </span>
          <h1 className="text-4xl font-serif text-[#21170F] sm:text-5xl">{title}</h1>
          <p className="max-w-2xl text-base leading-7 text-[#5C4A3C] sm:text-lg">
            {description}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <span className="rounded-full bg-[#1F1A17] px-4 py-2 text-sm font-medium text-white">
              {primaryLabel}
            </span>
            <span className="rounded-full border border-[#D8CCBE] bg-white/75 px-4 py-2 text-sm font-medium text-[#5C4A3C]">
              {secondaryLabel}
            </span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <article
            key={item.title}
            className="rounded-3xl border border-[#ECE5DD] bg-white p-6 shadow-sm transition-transform duration-300 hover:-translate-y-1"
          >
            <p className="mb-3 text-sm uppercase tracking-[0.18em] text-[#A26A4A]">{item.kicker}</p>
            <h2 className="mb-3 text-xl font-serif text-[#1F1A17]">{item.title}</h2>
            <p className="text-sm leading-6 text-[#625446]">{item.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
};

export default WorkspaceModulePage;
