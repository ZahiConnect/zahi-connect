import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import api, { registerUnauthorizedHandler, setAccessToken } from "../lib/axios";
import { buildSessionUser } from "../lib/authSession";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const applySession = useCallback((payload) => {
    const access = payload?.access;
    const userPayload = payload?.user ?? payload;

    if (!access || !userPayload) {
      clearSession();
      return null;
    }

    if (userPayload.role !== "customer") {
      clearSession();
      return null;
    }

    setAccessToken(access);
    const nextUser = buildSessionUser(userPayload);
    setUser(nextUser);
    return nextUser;
  }, [clearSession]);

  const refreshSession = useCallback(async () => {
    try {
      const response = await api.post("/auth/token/refresh");
      applySession(response.data);
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
      await api.post("/auth/logout");
    } catch {
      // Ignore logout transport failures and clear local session anyway.
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
      logout,
      refreshSession,
    }),
    [applySession, loading, logout, refreshSession, user]
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
