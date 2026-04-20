import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import api, {
  getStoredAccessToken,
  registerUnauthorizedHandler,
  setAccessToken,
} from "../lib/axios";
import { buildSessionDriver } from "../lib/authSession";
import mobilityService from "../services/mobilityService";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const applySession = useCallback(
    (payload, options = {}) => {
      const access = payload?.access;
      const driverPayload = payload?.driver ?? payload;

      if (access) {
        setAccessToken(access);
      } else if (!options.preserveAccess && !getStoredAccessToken()) {
        clearSession();
        return null;
      }

      if (!driverPayload?.id) {
        clearSession();
        return null;
      }

      const nextDriver = buildSessionDriver(driverPayload);
      setUser(nextDriver);
      return nextDriver;
    },
    [clearSession]
  );

  const refreshSession = useCallback(async () => {
    if (!getStoredAccessToken()) {
      setLoading(false);
      return;
    }

    try {
      const driver = await mobilityService.getMe();
      applySession({ driver }, { preserveAccess: true });
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [applySession, clearSession]);

  useEffect(() => {
    registerUnauthorizedHandler(clearSession);
    refreshSession();
    return () => registerUnauthorizedHandler(null);
  }, [clearSession, refreshSession]);

  const logout = useCallback(async () => {
    try {
      await api.post("/mobility/auth/logout");
    } catch {
      // Ignore transport failures and clear local session anyway.
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      applySession,
      clearSession,
      logout,
      refreshSession,
    }),
    [applySession, clearSession, loading, logout, refreshSession, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
