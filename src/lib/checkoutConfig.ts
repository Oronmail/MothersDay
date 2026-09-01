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

/** Guards the one-time GA `purchase` event per order (survives a page refresh). */
export const getPurchaseEventStorageKey = (orderId: string) =>
  `ga-purchase:${orderId}`;

/**
 * Maximum quantity the server accepts per line item (`/api/create-order`).
 * The UI enforces the same cap so a customer never hits a server rejection.
 */
export const MAX_ITEM_QUANTITY = 20;

export const MAX_ITEM_QUANTITY_MESSAGE = `אפשר להזמין עד ${MAX_ITEM_QUANTITY} יחידות מכל פריט`;
