import api from "../lib/axios";

const getPayload = async (url, params, requestConfig = {}) => {
  const response = await api.get(url, { params, ...requestConfig });
  return response.data;
};

export const marketplaceService = {
  getFoodItems: (params, requestConfig) => getPayload("/auth/marketplace/food-items", params, requestConfig),
  getRestaurants: (params, requestConfig) => getPayload("/auth/marketplace/restaurants", params, requestConfig),
  getRestaurant: (slug, params, requestConfig) =>
    getPayload(`/auth/marketplace/restaurants/${slug}`, params, requestConfig),
  getHotels: (params, requestConfig) => getPayload("/auth/marketplace/hotels", params, requestConfig),
  getHotel: (slug, params, requestConfig) => getPayload(`/auth/marketplace/hotels/${slug}`, params, requestConfig),
  getFlights: () => getPayload("/auth/marketplace/flights"),
  getFlight: (slug) => getPayload(`/auth/marketplace/flights/${slug}`),
};

export default marketplaceService;
