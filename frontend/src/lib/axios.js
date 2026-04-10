import axios from "axios";
import { store } from "../redux/store";
import { setCredentials, startFetching, stopFetching } from "../redux/authslice";
import { buildSessionUser } from "./authSession";

// Store access token in memory
let access_token_in_memory = null;
const isDevelopment = import.meta.env.MODE === 'development';

const api = axios.create({
  // In dev, Vite proxies /auth and /rms to the gateway to avoid cross-origin issues.
  baseURL: import.meta.env.VITE_API_BASE_URL || (isDevelopment ? "/" : "http://localhost:8080"),
  withCredentials: true,
  headers: {
    "X-Zahi-Portal": "workspace",
  },
});

export const setAccessToken = (token) => {
  access_token_in_memory = token;
};

// --- REQUEST INTERCEPTOR ---
api.interceptors.request.use((config) => {
  // Only show global loader if 'skipLoading' is NOT true
  if (!config.skipLoading) {
    store.dispatch(startFetching());
  }
  
  if (access_token_in_memory) {
    config.headers.Authorization = `Bearer ${access_token_in_memory}`;
  }
  return config;
});

// --- RESPONSE INTERCEPTOR ---
api.interceptors.response.use(
  (response) => {
    if (!response.config.skipLoading) {
      store.dispatch(stopFetching());
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 403 && error.response.data?.code === 'account_blocked') {
        window.dispatchEvent(new CustomEvent('account-blocked'));
        if (!originalRequest?.skipLoading) store.dispatch(stopFetching());
        return Promise.reject(error);
    }

    // Handle login/retry cases
    if (
        originalRequest.url.includes("/login") || 
        originalRequest.url.includes("/token/refresh") || 
        originalRequest._retry
    ) {
        if (!originalRequest.skipLoading) store.dispatch(stopFetching());
        return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Zahi accounts service uses /auth/token/refresh
        const rs = await api.post("/auth/token/refresh", {}, { skipLoading: true }); 
        const new_access = rs.data.access;
        setAccessToken(new_access);
        if (rs.data.user) {
          store.dispatch(
            setCredentials({
              user: buildSessionUser(rs.data.user),
              accessToken: new_access,
            })
          );
        }
        originalRequest.headers.Authorization = `Bearer ${new_access}`;
        
        if (!originalRequest.skipLoading) store.dispatch(stopFetching());
        
        return api(originalRequest);
      } catch (refreshError) {
        if (!originalRequest.skipLoading) store.dispatch(stopFetching());
        return Promise.reject(refreshError);
      }
    }

    // Standard error cleanup
    if (!originalRequest.skipLoading) {
        store.dispatch(stopFetching());
    }
    return Promise.reject(error);
  },
);

export default api;
