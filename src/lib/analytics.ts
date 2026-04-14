const ANALYTICS_MEASUREMENT_ID =
  import.meta.env.VITE_GA_MEASUREMENT_ID || "G-RZ3NF8NX21";

export const initAnalytics = () => {
  if (import.meta.env.MODE !== "production") {
    return;
  }

  if (!ANALYTICS_MEASUREMENT_ID || window.__analyticsInitialized) {
    return;
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    ((...args) => {
      window.dataLayer?.push(args);
    });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.gtag("js", new Date());
  window.gtag("config", ANALYTICS_MEASUREMENT_ID);
  window.__analyticsInitialized = true;
};
