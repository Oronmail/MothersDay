import type { VercelRequest } from "@vercel/node";

const FALLBACK_SITE_URL = "https://mothers-day-flax-one.vercel.app";

export const getRequestSiteUrl = (req: VercelRequest) => {
  const envSiteUrl = process.env.VITE_SITE_URL?.trim();
  if (envSiteUrl) {
    return envSiteUrl.replace(/\/$/, "");
  }

  const forwardedHost = req.headers["x-forwarded-host"];
  const forwardedProto = req.headers["x-forwarded-proto"];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host;
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || "https";

  if (!host) {
    return FALLBACK_SITE_URL;
  }

  return `${proto}://${host}`.replace(/\/$/, "");
};
