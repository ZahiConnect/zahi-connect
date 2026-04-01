import api from "../lib/axios";

const AI_BASE = "/ai/restaurant/chat";

export const aiService = {
  getRestaurantHistory: async (conversationId = null) => {
    const response = await api.get(`${AI_BASE}/history`, {
      params: conversationId ? { conversation_id: conversationId } : {},
      skipLoading: true,
    });
    return response.data;
  },

  sendRestaurantMessage: async (payload) => {
    const response = await api.post(`${AI_BASE}/message`, payload, {
      skipLoading: true,
    });
    return response.data;
  },

  clearRestaurantHistory: async (conversationId = null) => {
    const response = await api.delete(`${AI_BASE}/history`, {
      params: conversationId ? { conversation_id: conversationId } : {},
      skipLoading: true,
    });
    return response.data;
  },
};

export default aiService;
