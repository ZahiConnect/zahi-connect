import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiArrowRight,
  FiCheckCircle,
  FiPlusCircle,
  FiRefreshCw,
} from "react-icons/fi";
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col items-center">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        
        {/* Header Hero Section */}
        <section className="rounded-[40px] border border-gray-100 bg-white p-8 md:p-12 shadow-sm overflow-hidden relative">
          <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[150%] bg-gradient-to-l from-indigo-50 via-white to-white pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-600 mb-2">Choose workspace</p>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight mb-4">
                Pick the dashboard you want to open.
              </h1>
              <p className="text-sm font-bold leading-relaxed text-gray-500 max-w-xl">
                One account can now manage multiple Zahi business workspaces. Open the current one,
                switch to another business, or add a new workspace from the pricing page.
              </p>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-gray-50/50 px-6 py-5 text-sm">
              <p className="font-extrabold text-gray-900">
                {workspaces.length} Workspace{workspaces.length === 1 ? "" : "s"}
              </p>
              <p className="mt-1 font-bold text-gray-500 text-[11px] uppercase tracking-widest">Signed in as {user?.email || user?.username}</p>
            </div>
          </div>
        </section>

        {/* Workspaces Grid */}
        <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => {
            const isActive = workspace.tenant_id === activeWorkspace?.tenant_id;
            const isSwitching = switchingTenantId === workspace.tenant_id;

            return (
              <article
                key={workspace.tenant_id}
                className={`rounded-[40px] border ${isActive ? "border-indigo-100 shadow-md shadow-indigo-900/5" : "border-gray-100 shadow-sm"} bg-white p-8 transition-all hover:shadow-lg`}
              >
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div>
                    <p className={`inline-flex px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest mb-4 border ${isActive ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                      {getWorkspaceLabel(workspace.business_type)}
                    </p>
                    <h2 className="text-2xl font-extrabold text-gray-900">
                      {workspace.tenant_name || "Unnamed workspace"}
                    </h2>
                  </div>

                  {isActive && (
                    <span className="flex items-center justify-center w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-500">
                      <FiCheckCircle className="text-xl" />
                    </span>
                  )}
                </div>

                <div className="mt-6 mb-8 space-y-3">
                  <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 border border-gray-100/50">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Business type</span>
                    <span className="text-sm font-extrabold capitalize text-gray-900">{workspace.business_type}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 border border-gray-100/50">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Plan</span>
                    <span className="text-sm font-extrabold text-gray-900">{workspace.plan}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4 border border-gray-100/50">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Access role</span>
                    <span className="text-sm font-extrabold text-gray-900">{workspace.role}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openWorkspace(workspace)}
                  disabled={isSwitching}
                  className={`flex w-full items-center justify-center gap-2 rounded-2xl px-6 py-4 text-sm font-extrabold transition-all disabled:cursor-not-allowed disabled:opacity-60 active:scale-95 ${
                    isActive 
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-600/20" 
                      : "bg-gray-900 text-white hover:bg-black shadow-md shadow-gray-900/10"
                  }`}
                >
                  {isSwitching ? (
                    <>
                      <FiRefreshCw className="animate-spin text-lg" />
                      Switching...
                    </>
                  ) : (
                    <>
                      {isActive ? "Open dashboard" : "Switch and open"}
                      <FiArrowRight className="text-lg" />
                    </>
                  )}
                </button>
              </article>
            );
          })}

          <article className="rounded-[40px] border-2 border-dashed border-gray-200 bg-gray-50 p-8 flex flex-col justify-center transition-colors hover:bg-gray-100/50 hover:border-gray-300">
            <p className="inline-flex px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest mb-4 border bg-white text-gray-500 border-gray-200 self-start">
              Expand account
            </p>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-3">Add another workspace</h2>
            <p className="text-sm font-bold leading-relaxed text-gray-500 mb-8">
              Buy another restaurant, hotel, or mobility workspace from the public pricing page and
              keep it under the same login.
            </p>

            <Link
              to="/"
              state={{ scrollToPricing: true }}
              className="mt-auto flex w-full items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white px-6 py-4 text-sm font-extrabold text-gray-900 transition-colors hover:bg-gray-50 hover:border-gray-300 shadow-sm active:scale-95"
            >
              <FiPlusCircle className="text-lg" />
              Buy another workspace
            </Link>
          </article>
        </section>
      </div>
    </div>
  );
};

export default WorkspaceSelectPage;
