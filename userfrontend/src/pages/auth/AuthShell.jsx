import { Link } from "react-router-dom";

const AuthShell = ({ eyebrow, title, description, children, footer }) => (
  <div className="auth-shell relative min-h-screen overflow-hidden px-4 py-8">
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-[8%] top-[8%] h-44 w-44 rounded-full bg-[rgba(213,109,46,0.18)] blur-3xl" />
      <div className="absolute bottom-[10%] right-[12%] h-52 w-52 rounded-full bg-[rgba(46,125,103,0.14)] blur-3xl" />
    </div>

    <div className="auth-panel relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[36px] border border-[rgba(92,70,53,0.12)] bg-[rgba(255,250,244,0.7)] shadow-[0_30px_100px_rgba(61,42,26,0.12)] lg:grid-cols-[1fr_0.95fr]">
      <div className="auth-hero hero-grid relative hidden overflow-hidden bg-[#1f1812] px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(213,109,46,0.35),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(46,125,103,0.28),transparent_28%)]" />
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-lg font-bold text-[#1f1812]">
              Z
            </div>
            <div>
              <p className="font-display text-3xl">Zahi Connect</p>
              <p className="text-xs uppercase tracking-[0.24em] text-white/70">Customer access</p>
            </div>
          </Link>
        </div>

        <div className="relative max-w-xl">
          <p className="text-xs uppercase tracking-[0.26em] text-[#f6c7aa]">{eyebrow}</p>
          <h1 className="font-display mt-5 text-6xl leading-none">{title}</h1>
          <p className="mt-6 max-w-lg text-base leading-8 text-white/76">{description}</p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ["Restaurants", "Live menus from owner dashboards"],
              ["Hotels", "Room types, rates, and availability layers"],
              ["WhatsApp", "One-click handoff to the Zahi bot"],
            ].map(([label, copy]) => (
              <div
                key={label}
                className="rounded-[24px] border border-white/12 bg-white/6 p-4 backdrop-blur-md"
              >
                <p className="font-semibold">{label}</p>
                <p className="mt-2 text-sm leading-6 text-white/70">{copy}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#1f1812] text-lg font-bold text-white">
                Z
              </div>
              <div>
                <p className="auth-heading font-display text-3xl text-[#1f1812]">Zahi Connect</p>
                <p className="auth-muted text-xs uppercase tracking-[0.24em] text-[#876c56]">Customer access</p>
              </div>
            </Link>
          </div>

          {children}

          {footer ? <div className="auth-muted mt-8 text-sm text-[#6a5f56]">{footer}</div> : null}
        </div>
      </div>
    </div>
  </div>
);

export default AuthShell;
