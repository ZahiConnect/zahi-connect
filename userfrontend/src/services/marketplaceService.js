import api from "../lib/axios";

const getPayload = async (url, params) => {
  const response = await api.get(url, { params });
  return response.data;
};

export const marketplaceService = {
  getFoodItems: (params) => getPayload("/auth/marketplace/food-items", params),
  getRestaurants: (params) => getPayload("/auth/marketplace/restaurants", params),
  getRestaurant: (slug, params) => getPayload(`/auth/marketplace/restaurants/${slug}`, params),
  getHotels: () => getPayload("/auth/marketplace/hotels"),
  getHotel: (slug) => getPayload(`/auth/marketplace/hotels/${slug}`),
};

export default marketplaceService;
