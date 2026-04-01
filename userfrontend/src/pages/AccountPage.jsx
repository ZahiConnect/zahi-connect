import { Bot, Building2, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";

import { useAuth } from "../context/AuthContext";

const AccountPage = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      <section className="glass-panel rounded-[36px] px-6 py-8 sm:px-8">
        <p className="text-xs uppercase tracking-[0.26em] text-[#a6633b]">Account</p>
        <h1 className="font-display mt-3 text-6xl leading-none text-[#1f1812]">One identity across both frontends</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#6a5f56]">
          This customer app reuses the same auth backend as the existing owner dashboard, so your session, OTP flow, and workspace memberships stay consistent everywhere.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="soft-card rounded-[32px] p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1f1812] text-white">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#a6633b]">Profile</p>
              <h2 className="font-display text-4xl leading-none text-[#1f1812]">
                {user?.username || "Guest"}
              </h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-[24px] bg-[#fcf5ec] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a6633b]">Email</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#1f1812]">
                <Mail className="h-4 w-4" />
                {user?.email || "Not available"}
              </p>
            </div>

            <div className="rounded-[24px] bg-[#fcf5ec] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a6633b]">Mobile</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#1f1812]">
                <Phone className="h-4 w-4" />
                {user?.mobile || "Not added"}
              </p>
            </div>

            <div className="rounded-[24px] bg-[#fcf5ec] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a6633b]">Role</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#1f1812]">
                <ShieldCheck className="h-4 w-4" />
                {user?.role || "customer"}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="soft-card rounded-[32px] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#edf7f2] text-[#2e7d67]">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#a6633b]">Workspace visibility</p>
                <h2 className="font-display text-4xl leading-none text-[#1f1812]">Active memberships</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {user?.workspaces?.length ? (
                user.workspaces.map((workspace) => (
                  <div key={workspace.tenant_id} className="rounded-[24px] border border-[rgba(96,73,53,0.12)] bg-[#fffdf9] p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-[#1f1812]">{workspace.tenant_name || "Unnamed workspace"}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#8a7869]">
                          {workspace.business_type || "Unknown"} • {workspace.role}
                        </p>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${workspace.is_active ? "bg-[#1f1812] text-white" : "bg-[#f4e6d8] text-[#5d4d40]"}`}>
                        {workspace.plan || "free"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] bg-[#fcf5ec] p-4 text-sm leading-7 text-[#6a5f56]">
                  This account is acting like a pure customer profile right now. If you log in with an owner account, workspace memberships will show here too.
                </div>
              )}
            </div>
          </div>

          <div className="soft-card rounded-[32px] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f3e6d5] text-[#8e3f11]">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#a6633b]">What comes next</p>
                <h2 className="font-display text-4xl leading-none text-[#1f1812]">Customer tools roadmap</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {[
                "Saved restaurant carts",
                "Manual stay enquiries",
                "Ride requests when the cab layer is ready",
                "AI-assisted itinerary handoff",
              ].map((item) => (
                <div key={item} className="rounded-[24px] bg-[#fcf5ec] px-4 py-4 text-sm font-medium text-[#1f1812]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AccountPage;
