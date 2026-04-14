export const SITE_NAME = "יום האם Mother's Day";
export const FALLBACK_SITE_URL = "https://mothers-day-flax-one.vercel.app";

export const SUPPORT_EMAIL = "support@mothersday.co.il";
export const SUPPORT_PHONE_DISPLAY = "054-8024059";
export const SUPPORT_PHONE_E164 = "+972548024059";
export const WHATSAPP_URL = `https://wa.me/${SUPPORT_PHONE_E164.replace("+", "")}`;
export const INSTAGRAM_URL = import.meta.env.VITE_INSTAGRAM_URL?.trim() || "";

export const getSiteUrl = () => {
  const envSiteUrl = import.meta.env.VITE_SITE_URL?.trim();
  if (envSiteUrl) {
    return envSiteUrl.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return FALLBACK_SITE_URL;
};

export const getAbsoluteSiteUrl = (path = "/") => {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath}`;
};
