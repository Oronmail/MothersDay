export const CHECKOUT_ENABLED = import.meta.env.VITE_CHECKOUT_ENABLED === "true";

export const CHECKOUT_DISABLED_MESSAGE =
  "האתר עדיין לא מקבל הזמנות אונליין. נחבר את התשלום לפני העלייה לאוויר.";

export const getOrderAccessStorageKey = (orderId: string) =>
  `order-access:${orderId}`;
