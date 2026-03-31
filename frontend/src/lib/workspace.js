const privilegedRoles = new Set(["business_admin", "staff", "driver", "guide"]);

const isPaidWorkspace = (workspace) =>
  Boolean(
    workspace?.tenant_id &&
      workspace?.business_type &&
      workspace?.plan &&
      workspace.plan !== "free" &&
      privilegedRoles.has(workspace.role || "business_admin")
  );

export const getDashboardRouteForBusinessType = (businessType) => {
  switch (businessType) {
    case "hotel":
      return "/dashboard/bookings";
    case "mobility":
      return "/dashboard/rides";
    default:
      return "/dashboard";
  }
};

export const getUserWorkspaces = (user) => {
  if (!user) return [];

  const workspaces = Array.isArray(user.workspaces) ? user.workspaces.filter(isPaidWorkspace) : [];
  if (workspaces.length > 0) return workspaces;

  if (
    privilegedRoles.has(user.role) &&
    user.tenant_id &&
    user.business_type &&
    user.plan &&
    user.plan !== "free"
  ) {
    return [
      {
        tenant_id: user.tenant_id,
        tenant_name: user.tenant_name ?? null,
        business_type: user.business_type,
        plan: user.plan,
        role: user.role,
        is_active: true,
      },
    ];
  }

  return [];
};

export const hasWorkspaceAccess = (user) => {
  if (!user) return false;
  if (user.role === "super_admin") return true;
  return getUserWorkspaces(user).length > 0;
};

export const hasMultipleWorkspaces = (user) => getUserWorkspaces(user).length > 1;

export const getActiveWorkspace = (user) => {
  const workspaces = getUserWorkspaces(user);
  if (workspaces.length === 0) return null;

  return (
    workspaces.find((workspace) => workspace.is_active) ||
    workspaces.find((workspace) => workspace.tenant_id === user?.tenant_id) ||
    workspaces[0]
  );
};

export const getActiveWorkspaceRoute = (user) => {
  const activeWorkspace = getActiveWorkspace(user);
  if (activeWorkspace) {
    return getDashboardRouteForBusinessType(activeWorkspace.business_type);
  }

  return getDashboardRouteForBusinessType(user?.business_type);
};

export const getHomeRouteForUser = (user) => {
  if (!hasWorkspaceAccess(user)) return "/";
  if (hasMultipleWorkspaces(user)) return "/workspace-select";
  return getActiveWorkspaceRoute(user);
};

export const getWorkspaceLabel = (businessType) => {
  switch (businessType) {
    case "hotel":
      return "Hotel Workspace";
    case "mobility":
      return "Mobility Workspace";
    case "restaurant":
      return "Restaurant Workspace";
    default:
      return "Business Workspace";
  }
};
