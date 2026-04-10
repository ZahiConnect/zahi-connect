import api from "../lib/axios";

const getPayload = async (url) => {
  const response = await api.get(url);
  return response.data;
};

export const marketplaceService = {
  getFoodItems: () => getPayload("/auth/marketplace/food-items"),
  getRestaurants: () => getPayload("/auth/marketplace/restaurants"),
  getRestaurant: (slug) => getPayload(`/auth/marketplace/restaurants/${slug}`),
  getHotels: () => getPayload("/auth/marketplace/hotels"),
  getHotel: (slug) => getPayload(`/auth/marketplace/hotels/${slug}`),
};

export default marketplaceService;
