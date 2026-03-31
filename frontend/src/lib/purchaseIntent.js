const PURCHASE_INTENT_KEY = "zahi_pending_plan";

export const rememberPurchaseIntent = (planCode) => {
  if (!planCode) return;
  localStorage.setItem(PURCHASE_INTENT_KEY, planCode);
};

export const getPurchaseIntent = () => localStorage.getItem(PURCHASE_INTENT_KEY);

export const clearPurchaseIntent = () => {
  localStorage.removeItem(PURCHASE_INTENT_KEY);
};
