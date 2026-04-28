export const CAB_TIER_OPTIONS = [
  {
    key: "tier_1",
    label: "Tier 1",
    perKmRate: 20,
    minPassengers: 1,
    maxPassengers: 3,
    description: "Compact rides for 1-3 seats",
  },
  {
    key: "tier_2",
    label: "Tier 2",
    perKmRate: 50,
    minPassengers: 4,
    maxPassengers: 5,
    description: "Standard rides for 4-5 seats",
  },
  {
    key: "tier_3",
    label: "Tier 3",
    perKmRate: 100,
    minPassengers: 6,
    maxPassengers: 8,
    description: "Large rides for 6-8 seats",
  },
];

export const getCabTier = (tierKey) =>
  CAB_TIER_OPTIONS.find((tier) => tier.key === tierKey) || CAB_TIER_OPTIONS[0];

export const buildPassengerOptions = (tier) =>
  Array.from(
    { length: tier.maxPassengers - tier.minPassengers + 1 },
    (_, index) => tier.minPassengers + index
  );

export const clampPassengerCountForTier = (value, tier) => {
  const passengerCount = Number(value) || tier.minPassengers;
  return Math.min(tier.maxPassengers, Math.max(tier.minPassengers, passengerCount));
};
