export const isCheckoutEnabled = () =>
  process.env.CHECKOUT_ENABLED === "true" ||
  process.env.VITE_CHECKOUT_ENABLED === "true";

export const isPaymentSimulationEnabled = () =>
  process.env.PAYMENT_SIMULATION_ENABLED === "true" ||
  process.env.VITE_PAYMENT_SIMULATION_ENABLED === "true";

export const canSubmitCheckout = () =>
  isCheckoutEnabled() || isPaymentSimulationEnabled();
