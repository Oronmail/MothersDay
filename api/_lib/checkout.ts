export const isCheckoutEnabled = () =>
  process.env.CHECKOUT_ENABLED === "true" ||
  process.env.VITE_CHECKOUT_ENABLED === "true";
