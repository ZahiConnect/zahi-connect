import api from "../lib/axios";

const getPayload = async (url, options) => {
  const response = await api.get(url, options);
  return response.data;
};

const sendPayload = async (method, url, payload) => {
  const response = await api({
    method,
    url,
    data: payload,
  });
  return response.data;
};

export const mobilityService = {
  registerDriver: (payload) => sendPayload("post", "/mobility/auth/register", payload),
  loginDriver: (payload) => sendPayload("post", "/mobility/auth/login", payload),
  logoutDriver: () => sendPayload("post", "/mobility/auth/logout"),
  googleAuth: (credential) => sendPayload("post", "/mobility/auth/google", { credential }),
  getMe: () => getPayload("/mobility/auth/me"),
  getDashboard: () => getPayload("/mobility/driver/dashboard"),
  getRideRequests: (limit = 12) => getPayload("/mobility/driver/ride-requests", { params: { limit } }),
  updateProfile: (payload) => sendPayload("patch", "/mobility/driver/profile", payload),
  updateVehicle: (payload) => sendPayload("put", "/mobility/driver/vehicle", payload),
  updateStatus: (payload) => sendPayload("patch", "/mobility/driver/status", payload),
  uploadImage: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/mobility/images/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
};

export default mobilityService;
