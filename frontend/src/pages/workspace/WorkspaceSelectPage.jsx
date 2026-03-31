import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  HiOutlineArrowRight,
  HiOutlineCheckCircle,
  HiOutlinePlusCircle,
  HiOutlineRefresh,
} from "react-icons/hi";
import toast from "react-hot-toast";
import api, { setAccessToken } from "../../lib/axios";
import { setCredentials } from "../../redux/authslice";
import { buildSessionUser } from "../../lib/authSession";
import {
  getActiveWorkspace,
  getActiveWorkspaceRoute,
  getUserWorkspaces,
  getWorkspaceLabel,
} from "../../lib/workspace";

const WorkspaceSelectPage = () => {
  const [switchingTenantId, setSwitchingTenantId] = useState(null);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const workspaces = getUserWorkspaces(user);
  const activeWorkspace = getActiveWorkspace(user);

  const openWorkspace = async (workspace) => {
    if (!workspace?.tenant_id) return;

    if (workspace.tenant_id === activeWorkspace?.tenant_id) {
      navigate(getActiveWorkspaceRoute(user));
      return;
    }

    setSwitchingTenantId(workspace.tenant_id);

    try {
      const response = await api.post(
        "/auth/workspaces/switch",
        { tenant_id: workspace.tenant_id },
        { skipLoading: true }
      );

      const nextUser = buildSessionUser(response.data);
      setAccessToken(response.data.access);
      dispatch(
        setCredentials({
          user: nextUser,
          accessToken: response.data.access,
        })
      );

      toast.success(`${workspace.tenant_name || "Workspace"} is ready.`);
      navigate(getActiveWorkspaceRoute(nextUser));
    } catch (error) {
      toast.error(
        error.response?.data?.detail || "We could not switch the active workspace right now."
      );
    } finally {
      setSwitchingTenantId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F1EA] px-5 py-10 text-[#1F1A17] sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-[34px] border border-[#E7DCCE] bg-[linear-gradient(135deg,#FFF9F2_0%,#F4E5D6_58%,#EBD5C2_100%)] p-8 shadow-[0_20px_55px_rgba(117,81,44,0.12)] sm:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.24em] text-[#A76541]">Choose workspace</p>
              <h1 className="mt-3 text-4xl font-serif sm:text-5xl">
                Pick the dashboard you want to open.
              </h1>
              <p className="mt-4 text-base leading-7 text-[#5C4A3C]">
                One account can now manage multiple Zahi business workspaces. Open the current one,
                switch to another business, or add a new workspace from the pricing page.
              </p>
            </div>

            <div className="rounded-3xl border border-[#DFC7B2] bg-white/80 px-5 py-4 text-sm text-[#5C4A3C]">
              <p className="font-semibold text-[#1F1A17]">
                {workspaces.length} workspace{workspaces.length === 1 ? "" : "s"}
              </p>
              <p className="mt-1">Signed in as {user?.email || user?.username}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => {
            const isActive = workspace.tenant_id === activeWorkspace?.tenant_id;
            const isSwitching = switchingTenantId === workspace.tenant_id;

            return (
              <article
                key={workspace.tenant_id}
                className="rounded-[30px] border border-[#E8DDD1] bg-white p-7 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.18em] text-[#A76541]">
                      {getWorkspaceLabel(workspace.business_type)}
                    </p>
                    <h2 className="mt-3 text-3xl font-serif text-[#1F1A17]">
                      {workspace.tenant_name || "Unnamed workspace"}
                    </h2>
                  </div>

                  {isActive ? (
                    <span className="inline-flex items-center gap-2 rounded-full bg-[#EEF6EA] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#2D6A3C]">
                      <HiOutlineCheckCircle className="text-sm" />
                      Active
                    </span>
                  ) : null}
                </div>

                <div className="mt-6 space-y-3 text-sm text-[#625446]">
                  <div className="rounded-2xl bg-[#FBF5EE] px-4 py-3">
                    Business type:{" "}
                    <span className="font-medium capitalize text-[#1F1A17]">
                      {workspace.business_type}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-[#FBF5EE] px-4 py-3">
                    Plan: <span className="font-medium text-[#1F1A17]">{workspace.plan}</span>
                  </div>
                  <div className="rounded-2xl bg-[#FBF5EE] px-4 py-3">
                    Access role: <span className="font-medium text-[#1F1A17]">{workspace.role}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openWorkspace(workspace)}
                  disabled={isSwitching}
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#1F1A17] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#35281F] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSwitching ? (
                    <>
                      <HiOutlineRefresh className="animate-spin text-base" />
                      Switching...
                    </>
                  ) : (
                    <>
                      {isActive ? "Open dashboard" : "Switch and open"}
                      <HiOutlineArrowRight className="text-base" />
                    </>
                  )}
                </button>
              </article>
            );
          })}

          <article className="rounded-[30px] border border-dashed border-[#D8C7B8] bg-[#FCF7F1] p-7 shadow-sm">
            <p className="text-sm uppercase tracking-[0.18em] text-[#A76541]">Expand account</p>
            <h2 className="mt-3 text-3xl font-serif text-[#1F1A17]">Add another workspace</h2>
            <p className="mt-4 text-sm leading-7 text-[#625446]">
              Buy another restaurant, hotel, or mobility workspace from the public pricing page and
              keep it under the same login.
            </p>

            <Link
              to="/"
              state={{ scrollToPricing: true }}
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#D7C6B7] bg-white px-5 py-3 text-sm font-semibold text-[#3A2C21] transition-colors hover:bg-[#FFFDF9]"
            >
              <HiOutlinePlusCircle className="text-base" />
              Buy another workspace
            </Link>
          </article>
        </section>
      </div>
    </div>
  );
};

export default WorkspaceSelectPage;
