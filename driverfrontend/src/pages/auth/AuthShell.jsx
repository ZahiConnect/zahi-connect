import { Link } from "react-router-dom";
import { CarFront } from "lucide-react";

const AuthShell = ({ eyebrow, title, description, footer, children }) => (
  <div className="flex h-screen overflow-hidden bg-white">
    {/* Left Side Section - Dark/Premium branding */}
    <div className="relative hidden w-0 flex-1 bg-zinc-900 lg:block overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=2000&auto=format&fit=crop')] opacity-10 bg-cover bg-center mix-blend-overlay" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#facc15]/10 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3" />
      
      {/* Absolute Logo Top Left */}
      <div className="absolute top-12 left-12 lg:top-16 lg:left-16 z-20">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#facc15] text-[#422006] shadow-lg group-hover:scale-105 transition-transform">
            <CarFront strokeWidth={2.5} size={24} />
          </div>
          <div>
            <p className="font-display text-2xl font-bold tracking-tight leading-none text-white">Zahi Drive</p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#facc15]">
              Authorised Access
            </p>
          </div>
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
    <div className="relative flex flex-1 flex-col justify-start px-4 py-16 sm:px-6 lg:flex-none lg:w-1/2 lg:px-20 xl:px-24 overflow-y-auto">
      <div className="absolute top-4 left-4 lg:hidden">
        <Link to="/" className="inline-flex items-center justify-center p-3 rounded-full bg-slate-50 text-slate-800 hover:bg-slate-100">
           <CarFront size={20} />
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
