import api from "../lib/axios";

const subscriptionService = {
  getPlans: async () => {
    const response = await api.get("/auth/subscriptions/plans", { skipLoading: true });
    return response.data;
  },

  createCheckout: async (payload) => {
    const response = await api.post("/auth/subscriptions/checkout", payload, { skipLoading: true });
    return response.data;
  },

  verifyPayment: async (payload) => {
    const response = await api.post("/auth/subscriptions/verify", payload, { skipLoading: true });
    return response.data;
  },
};

export default subscriptionService;
