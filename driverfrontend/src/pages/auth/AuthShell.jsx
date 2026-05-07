import { Link } from "react-router-dom";
import ZahiLogo from "../../components/ZahiLogo";

const AuthShell = ({ eyebrow, title, description, footer, children }) => (
  <div className="flex min-h-screen bg-white lg:h-screen lg:overflow-hidden">
    {/* Left Side Section - Dark/Premium branding */}
    <div className="relative hidden w-0 flex-1 bg-zinc-900 lg:block overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=2000&auto=format&fit=crop')] opacity-10 bg-cover bg-center mix-blend-overlay" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#facc15]/10 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3" />
      
      {/* Absolute Logo Top Left */}
      <div className="absolute top-12 left-12 lg:top-16 lg:left-16 z-20">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <ZahiLogo
            label="Zahi Drive"
            tagline="Authorised Access"
            markVariant="light"
            markClassName="h-12 w-12 rounded-xl shadow-lg transition-transform group-hover:scale-105"
            labelClassName="font-display text-2xl font-bold tracking-tight text-white"
            taglineClassName="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#facc15]"
          />
        </Link>
      </div>

      {/* Centered Typography */}
      <div className="relative z-10 flex h-full flex-col justify-center p-12 lg:p-16 max-w-3xl fade-up">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-300 mb-6 backdrop-blur-md">
            <div className="w-1.5 h-1.5 rounded-full bg-[#facc15]" /> {eyebrow}
          </span>
          <h1 className="font-display text-5xl font-bold tracking-tight leading-[1.1] text-white lg:text-6xl">
            {title}
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400 font-medium">{description}</p>
        </div>
      </div>
    </div>

    {/* Right Side - Form Container */}
    <div className="relative flex min-h-screen flex-1 flex-col justify-start overflow-y-auto px-4 pb-10 pt-20 sm:px-6 sm:py-16 lg:h-screen lg:flex-none lg:w-1/2 lg:px-20 xl:px-24">
      <div className="absolute top-4 left-4 lg:hidden">
        <Link to="/" className="inline-flex items-center justify-center p-3 rounded-full bg-slate-50 text-slate-800 hover:bg-slate-100">
           <img src={`${import.meta.env.BASE_URL}black_logo.png`} alt="Zahi Drive" className="h-5 w-5 rounded-md object-cover" />
        </Link>
      </div>
      <div className="mx-auto w-full max-w-md">
        {children}
        {footer ? <div className="mt-8 text-sm text-slate-500 font-medium text-center">{footer}</div> : null}
      </div>
    </div>
  </div>
);

export default AuthShell;
