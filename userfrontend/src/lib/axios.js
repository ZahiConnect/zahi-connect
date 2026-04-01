import axios from "axios";

let accessTokenInMemory = null;
let onUnauthorized = () => {};

const isDevelopment = import.meta.env.MODE === "development";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || (isDevelopment ? "/" : "http://localhost:8080"),
  withCredentials: true,
});

export const setAccessToken = (token) => {
  accessTokenInMemory = token;
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
    const originalRequest = error.config;

    if (
      !originalRequest ||
      originalRequest._retry ||
      originalRequest.url?.includes("/auth/login") ||
      originalRequest.url?.includes("/auth/token/refresh")
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await api.post("/auth/token/refresh");
        const nextAccessToken = refreshResponse.data.access;
        setAccessToken(nextAccessToken);
        originalRequest.headers.Authorization = `Bearer ${nextAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        onUnauthorized();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
