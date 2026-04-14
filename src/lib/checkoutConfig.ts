export const CHECKOUT_ENABLED = import.meta.env.VITE_CHECKOUT_ENABLED === "true";
export const PAYMENT_SIMULATION_ENABLED =
  import.meta.env.VITE_PAYMENT_SIMULATION_ENABLED === "true";
export const CAN_SUBMIT_CHECKOUT =
  CHECKOUT_ENABLED || PAYMENT_SIMULATION_ENABLED;

export const CHECKOUT_DISABLED_MESSAGE =
  "האתר עדיין לא מקבל הזמנות אונליין. נחבר את התשלום לפני העלייה לאוויר.";

export const PAYMENT_SIMULATION_MESSAGE =
  "זהו מסלול בדיקה בלבד. לא יבוצע חיוב אמיתי.";

export const getOrderAccessStorageKey = (orderId: string) =>
  `order-access:${orderId}`;
