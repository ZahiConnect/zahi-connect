const normalizeOptionalString = (value) => {
  if (typeof value !== "string") return value ?? null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  if (["string", "null", "undefined", "none"].includes(lower)) {
    return null;
  }

  return trimmed;
};

const normalizeWorkspace = (workspace = {}) => ({
  tenant_id: workspace.tenant_id ?? null,
  tenant_name: normalizeOptionalString(workspace.tenant_name),
  business_type: normalizeOptionalString(workspace.business_type),
  plan: normalizeOptionalString(workspace.plan) ?? "free",
  role: normalizeOptionalString(workspace.role) ?? "business_admin",
  is_active: Boolean(workspace.is_active),
});

export const buildSessionUser = (data) => ({
  id: data.id,
  username: data.username,
  email: data.email,
  role: data.role,
  mobile: normalizeOptionalString(data.mobile),
  first_name: normalizeOptionalString(data.first_name),
  last_name: normalizeOptionalString(data.last_name),
  address: normalizeOptionalString(data.address),
  status: normalizeOptionalString(data.status) ?? "active",
  is_active: typeof data.is_active === "boolean" ? data.is_active : true,
  tenant_id: data.tenant_id ?? null,
  tenant_name: normalizeOptionalString(data.tenant_name),
  business_type: normalizeOptionalString(data.business_type),
  plan: normalizeOptionalString(data.plan) ?? "free",
  workspaces: Array.isArray(data.workspaces) ? data.workspaces.map(normalizeWorkspace) : [],
  workspace_count:
    typeof data.workspace_count === "number"
      ? data.workspace_count
      : Array.isArray(data.workspaces)
        ? data.workspaces.length
        : 0,
});
