import { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CalendarDays,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";
import {
  formatCurrency,
  formatDateRange,
  formatServiceLabel,
  formatShortDate,
} from "../lib/format";
import bookingService from "../services/bookingService";

const extractDateLabel = (request) => {
  const metadata = request.metadata || {};
  if (request.service_type === "hotel") {
    return formatDateRange(metadata.check_in, metadata.check_out);
  }
  if (request.service_type === "restaurant") {
    return `${metadata.diners || 1} diner(s)`;
  }
  if (request.service_type === "cab") {
    return formatShortDate(metadata.travel_date);
  }
  if (request.service_type === "flight") {
    return formatShortDate(metadata.depart_date);
  }
  return "Request saved";
};

const extractMetaLine = (request) => {
  const metadata = request.metadata || {};
  if (request.service_type === "hotel") {
    return `${metadata.guests || 1} guest(s) • ${metadata.preferred_room_type || "Any room type"}`;
  }
  if (request.service_type === "restaurant") {
    return `${metadata.items?.length || 0} line item(s) • ${metadata.diners || 1} diner(s)`;
  }
  if (request.service_type === "cab") {
    return `${metadata.pickup || "Pickup"} → ${metadata.drop || "Drop"}`;
  }
  if (request.service_type === "flight") {
    return `${metadata.from || "Origin"} → ${metadata.to || "Destination"}`;
  }
  return request.summary || "Request captured";
};

const AccountPage = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const data = await bookingService.getRequests();
        if (active) {
          setRequests(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Failed to load booking requests", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const groupedRequests = useMemo(() => {
    return requests.reduce((grouped, request) => {
      const key = request.service_type;
      grouped[key] = grouped[key] || [];
      grouped[key].push(request);
      return grouped;
    }, {});
  }, [requests]);

  return (
    <div className="space-y-8">
      <section className="glass-panel rounded-[38px] px-6 py-8 sm:px-8">
        <p className="text-xs uppercase tracking-[0.28em] text-[#c15d1f]">Customer account</p>
        <h1 className="font-display mt-3 text-6xl leading-none text-[#1f1812]">One identity, two Zahi portals</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[#68584b]">
          This account uses the same central auth service as the workspace frontend, but customer
          sessions now stay isolated so the booking portal and operator dashboard no longer step on
          each other.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="soft-card rounded-[34px] p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1f1812] text-white">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Profile</p>
              <h2 className="font-display text-4xl leading-none text-[#1f1812]">
                {user?.username || "Guest"}
              </h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="rounded-[24px] bg-[#fcf5ec] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Email</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#1f1812]">
                <Mail className="h-4 w-4" />
                {user?.email || "Not available"}
              </p>
            </div>

            <div className="rounded-[24px] bg-[#fcf5ec] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Mobile</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#1f1812]">
                <Phone className="h-4 w-4" />
                {user?.mobile || "Not added"}
              </p>
            </div>

            <div className="rounded-[24px] bg-[#fcf5ec] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-[#a2856b]">Portal role</p>
              <p className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-[#1f1812]">
                <ShieldCheck className="h-4 w-4" />
                {user?.role || "customer"}
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="soft-card rounded-[34px] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef7f2] text-[#2e7d67]">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Saved requests</p>
                <h2 className="font-display text-4xl leading-none text-[#1f1812]">My travel activity</h2>
              </div>
            </div>

            {loading ? (
              <div className="mt-5 space-y-3">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="h-24 animate-pulse rounded-[24px] bg-[#fbf2e7]" />
                ))}
              </div>
            ) : requests.length === 0 ? (
              <div className="mt-5 rounded-[24px] bg-[#fcf5ec] px-4 py-6 text-sm leading-7 text-[#68584b]">
                No booking requests yet. Start with a hotel stay, a restaurant order, or save your
                future cab and flight interest from the new customer portal.
              </div>
            ) : (
              <div className="mt-5 space-y-5">
                {Object.entries(groupedRequests).map(([serviceType, items]) => (
                  <div key={serviceType} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.22em] text-[#a2856b]">
                        {formatServiceLabel(serviceType)}
                      </p>
                      <span className="rounded-full bg-[#fbefe4] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a54d16]">
                        {items.length} request(s)
                      </span>
                    </div>
                    {items.map((request) => (
                      <div
                        key={request.id}
                        className="rounded-[26px] border border-[rgba(96,73,53,0.12)] bg-[#fffdf9] p-4"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-lg font-semibold text-[#1f1812]">{request.title}</p>
                            <p className="mt-2 text-sm leading-7 text-[#68584b]">
                              {request.summary || extractMetaLine(request)}
                            </p>
                            <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#8a7869]">
                              {extractDateLabel(request)} • {extractMetaLine(request)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="rounded-full bg-[#eef7f2] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#32695b]">
                              {request.status}
                            </span>
                            <p className="mt-3 text-xs uppercase tracking-[0.18em] text-[#a2856b]">
                              Saved {formatShortDate(request.created_at)}
                            </p>
                            {request.total_amount ? (
                              <p className="mt-1 font-semibold text-[#1f1812]">
                                {formatCurrency(request.total_amount)}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="soft-card rounded-[34px] p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fbefe4] text-[#a54d16]">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-[#c15d1f]">Shared identity view</p>
                <h2 className="font-display text-4xl leading-none text-[#1f1812]">Workspace visibility</h2>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {user?.workspaces?.length ? (
                user.workspaces.map((workspace) => (
                  <div key={workspace.tenant_id} className="rounded-[24px] bg-[#fcf5ec] p-4">
                    <p className="text-lg font-semibold text-[#1f1812]">{workspace.tenant_name || "Unnamed workspace"}</p>
                    <p className="mt-2 text-xs uppercase tracking-[0.18em] text-[#8a7869]">
                      {workspace.business_type || "Unknown"} • {workspace.role} • {workspace.plan}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] bg-[#fcf5ec] p-4 text-sm leading-7 text-[#68584b]">
                  This account is currently behaving as a pure customer profile. If the same person
                  also owns business workspaces, they can still use the main frontend through the
                  workspace portal with its separate session cookie.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AccountPage;
