import axios from "axios";

const STORAGE_KEY = "zahi_drive_access";

let accessTokenInMemory = window.localStorage.getItem(STORAGE_KEY);
let onUnauthorized = () => {};

const isDevelopment = import.meta.env.MODE === "development";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || (isDevelopment ? "/" : "http://localhost:8080"),
  headers: {
    "X-Zahi-Portal": "driver",
  },
});

export const getStoredAccessToken = () => accessTokenInMemory;

export const setAccessToken = (token) => {
  accessTokenInMemory = token || null;
  if (token) {
    window.localStorage.setItem(STORAGE_KEY, token);
    return;
  }
  window.localStorage.removeItem(STORAGE_KEY);
};

export const registerUnauthorizedHandler = (handler) => {
  onUnauthorized = typeof handler === "function" ? handler : () => {};
};

api.interceptors.request.use((config) => {
  if (accessTokenInMemory) {
    config.headers.Authorization = `Bearer ${accessTokenInMemory}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestUrl = error.config?.url || "";
    if (
      error.response?.status === 401 &&
      !requestUrl.includes("/mobility/auth/login") &&
      !requestUrl.includes("/mobility/auth/register")
    ) {
      setAccessToken(null);
      onUnauthorized();
    }

    return Promise.reject(error);
  }
);

export default api;
