import api from "../lib/axios";

const RMS_BASE = "/rms";

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.append(key, value);
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
};

export const restaurantService = {
  getDashboardStats: async (days = 7) => {
    const response = await api.get(`${RMS_BASE}/reports/dashboard${buildQuery({ days })}`);
    return response.data;
  },

  getTables: async () => {
    const response = await api.get(`${RMS_BASE}/tables/`);
    return response.data;
  },

  createTable: async (data) => {
    const response = await api.post(`${RMS_BASE}/tables/`, data);
    return response.data;
  },

  updateTable: async (id, data) => {
    const response = await api.patch(`${RMS_BASE}/tables/${id}`, data);
    return response.data;
  },

  updateTableStatus: async (id, payload) => {
    const body = typeof payload === "string" ? { status: payload } : payload;
    const response = await api.patch(`${RMS_BASE}/tables/${id}/status`, body);
    return response.data;
  },

  deleteTable: async (id) => {
    await api.delete(`${RMS_BASE}/tables/${id}`);
  },

  getKitchenBoard: async () => {
    const response = await api.get(`${RMS_BASE}/kitchen/board`);
    return response.data;
  },

  createOrder: async (data) => {
    const response = await api.post(`${RMS_BASE}/orders/`, data);
    return response.data;
  },

  getOrders: async (params = {}) => {
    const response = await api.get(`${RMS_BASE}/orders/${buildQuery(params)}`);
    return response.data;
  },

  getOrder: async (orderId) => {
    const response = await api.get(`${RMS_BASE}/orders/${orderId}`);
    return response.data;
  },

  updateOrderStatus: async (orderId, newStatus) => {
    const response = await api.patch(`${RMS_BASE}/orders/${orderId}/status`, {
      status: newStatus,
    });
    return response.data;
  },

  cancelOrder: async (orderId) => {
    await api.delete(`${RMS_BASE}/orders/${orderId}`);
  },

  getInventory: async () => {
    const response = await api.get(`${RMS_BASE}/inventory/`);
    return response.data;
  },

  getLowStockInventory: async () => {
    const response = await api.get(`${RMS_BASE}/inventory/low-stock`);
    return response.data;
  },

  createInventoryItem: async (data) => {
    const response = await api.post(`${RMS_BASE}/inventory/`, data);
    return response.data;
  },

  updateInventoryItem: async (id, data) => {
    const response = await api.patch(`${RMS_BASE}/inventory/${id}`, data);
    return response.data;
  },

  deleteInventoryItem: async (id) => {
    await api.delete(`${RMS_BASE}/inventory/${id}`);
  },

  getMenuCategories: async () => {
    const response = await api.get(`${RMS_BASE}/menu/categories`);
    return response.data;
  },

  createMenuCategory: async (data) => {
    const response = await api.post(`${RMS_BASE}/menu/categories`, data);
    return response.data;
  },

  deleteMenuCategory: async (id) => {
    await api.delete(`${RMS_BASE}/menu/categories/${id}`);
  },

  getMenu: async (categoryId = null) => {
    const response = await api.get(
      `${RMS_BASE}/menu/items${buildQuery({ category_id: categoryId })}`
    );
    return response.data;
  },

  createMenuItem: async (data) => {
    const response = await api.post(`${RMS_BASE}/menu/items`, data);
    return response.data;
  },

  updateMenuItem: async (id, data) => {
    const response = await api.patch(`${RMS_BASE}/menu/items/${id}`, data);
    return response.data;
  },

  deleteMenuItem: async (id) => {
    await api.delete(`${RMS_BASE}/menu/items/${id}`);
  },

  uploadMenuItemImage: async (id, file) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(`${RMS_BASE}/menu/items/${id}/image`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },
};

export default restaurantService;
