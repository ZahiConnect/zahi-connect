import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";

import { setCredentials } from "../../../redux/authslice";
import restaurantService from "../../../services/restaurantService";

export const splitCommaValues = (value) =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export function useRestaurantSettingsPage() {
  const dispatch = useDispatch();
  const { user, accessToken } = useSelector((state) => state.auth);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncWorkspaceName = useCallback(
    (nextName) => {
      if (!user || !accessToken || !nextName || nextName === user.tenant_name) {
        return;
      }

      dispatch(
        setCredentials({
          user: {
            ...user,
            tenant_name: nextName,
            workspaces: Array.isArray(user.workspaces)
              ? user.workspaces.map((workspace) =>
                  workspace.tenant_id === user.tenant_id
                    ? { ...workspace, tenant_name: nextName }
                    : workspace
                )
              : [],
          },
          accessToken,
        })
      );
    },
    [accessToken, dispatch, user]
  );

  const hydrate = useCallback(
    (payload) => {
      setSettings(payload);
      syncWorkspaceName(payload?.tenant?.name);
      return payload;
    },
    [syncWorkspaceName]
  );

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const payload = await restaurantService.getSettings();
      hydrate(payload);
    } catch (error) {
      console.error("Failed to load restaurant settings", error);
      toast.error("Could not load restaurant settings.");
    } finally {
      setLoading(false);
    }
  }, [hydrate]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    loading,
    hydrate,
    reloadSettings: loadSettings,
  };
}
