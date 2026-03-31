import api from '../lib/axios';

const RESTAURANT_URL = '/restaurant';

export const restaurantService = {
    // --- TABLES ---
    getTables: async () => {
        const response = await api.get(`/rms/tables`);
        return response.data;
    },
    createTable: async (data) => {
        const response = await api.post(`/rms/tables/`, data);
        return response.data;
    },
    updateTableStatus: async (id, status) => {
        const response = await api.patch(`/rms/tables/${id}/status`, { status });
        return response.data;
    },

    // --- KITCHEN ---
    getKitchenOrders: async () => {
        const response = await api.get(`${RESTAURANT_URL}/kitchen/orders`);
        return response.data;
    },
    updateKitchenOrderStatus: async (orderId, newStatus) => {
        const response = await api.patch(`${RESTAURANT_URL}/kitchen/orders/${orderId}`, { status: newStatus });
        return response.data;
    },

    // --- ORDERS ---
    createOrder: async (data) => {
        const response = await api.post(`/rms/orders/`, data);
        return response.data;
    },
    getOrders: async () => {
        const response = await api.get(`/rms/orders/`);
        return response.data;
    },
    updateOrderStatus: async (orderId, newStatus) => {
        const response = await api.patch(`/rms/orders/${orderId}/status`, { status: newStatus });
        return response.data;
    },

    // --- INVENTORY ---
    getInventory: async () => {
        const response = await api.get(`/rms/inventory/`);
        return response.data;
    },
    createInventoryItem: async (data) => {
        const response = await api.post(`/rms/inventory/`, data);
        return response.data;
    },
    updateInventoryItem: async (id, data) => {
        const response = await api.patch(`/rms/inventory/${id}`, data);
        return response.data;
    },
    deleteInventoryItem: async (id) => {
        const response = await api.delete(`/rms/inventory/${id}`);
        return response.data;
    },

    // --- MENU ---
    getMenuCategories: async () => {
        const response = await api.get(`/rms/menu/categories`);
        return response.data;
    },
    createMenuCategory: async (data) => {
        const response = await api.post(`/rms/menu/categories`, data);
        return response.data;
    },
    deleteMenuCategory: async (id) => {
        const response = await api.delete(`/rms/menu/categories/${id}`);
        return response.data;
    },
    getMenu: async (categoryId = null) => {
        const url = categoryId ? `/rms/menu/items?category_id=${categoryId}` : `/rms/menu/items`;
        const response = await api.get(url);
        return response.data;
    },
    createMenuItem: async (data) => {
        const response = await api.post(`/rms/menu/items`, data);
        return response.data;
    },
    updateMenuItem: async (id, data) => {
        const response = await api.patch(`/rms/menu/items/${id}`, data);
        return response.data;
    },
    deleteMenuItem: async (id) => {
        const response = await api.delete(`/rms/menu/items/${id}`);
        return response.data;
    },
    uploadMenuItemImage: async (id, file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post(`/rms/menu/items/${id}/image`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
    
    // --- DASHBOARD ANALYTICS (Optional/Computed) ---
    getDashboardStats: async () => {
        const response = await api.get(`${RESTAURANT_URL}/orders/stats`);
        return response.data;
    }
};

export default restaurantService;
