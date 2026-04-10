import api from "../lib/axios";

const getPayload = async (url, options) => {
  const response = await api.get(url, options);
  return response.data;
};

const postPayload = async (url, payload) => {
  const response = await api.post(url, payload);
  return response.data;
};

export const bookingService = {
  getRequests: (params = {}) => getPayload("/booking/requests", { params }),
  createRequest: (payload) => postPayload("/booking/requests", payload),
};

export default bookingService;
