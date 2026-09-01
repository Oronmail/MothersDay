/**
 * Server-side feature flags. Deliberately NOT falling back to the VITE_*
 * variables: those are client-bundle flags, and a mis-set client var must
 * never enable server-side order creation or fake payments.
 */

export const isCheckoutEnabled = () => process.env.CHECKOUT_ENABLED === "true";

// The simulation marks orders paid and sends emails without charging anyone.
// Hard-refused in the production environment regardless of env vars.
export const isPaymentSimulationEnabled = () =>
  process.env.PAYMENT_SIMULATION_ENABLED === "true" &&
  process.env.VERCEL_ENV !== "production";

export const canSubmitCheckout = () =>
  isCheckoutEnabled() || isPaymentSimulationEnabled();
