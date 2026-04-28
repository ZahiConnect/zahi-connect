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
  getRequest: (requestId) => getPayload(`/booking/requests/${requestId}`),
  createRequest: (payload) => postPayload("/booking/requests", payload),
  createPaymentCheckout: (payload) => postPayload("/booking/payments/checkout", payload),
  verifyPayment: (payload) => postPayload("/booking/payments/verify", payload),
};

export default bookingService;
