import api from "../lib/axios";

const getPayload = async (url, options) => {
  const response = await api.get(url, options);
  return response.data;
};

const postPayload = async (url, payload) => {
  const response = await api.post(url, payload);
  return response.data;
};

export const mobilityService = {
  getNearbyDrivers: (params = {}) => getPayload("/mobility/public/drivers/nearby", { params }),
  createRideRequest: (payload) => postPayload("/mobility/public/ride-requests", payload),
  getRideRequestStatus: (rideRequestId) => getPayload(`/mobility/public/ride-requests/${rideRequestId}`),
};

export default mobilityService;
