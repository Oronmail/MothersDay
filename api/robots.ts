import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getRequestSiteUrl } from "./_lib/siteUrl.js";

// Crawlers of AI assistants and AI search engines, explicitly welcomed so the
// brand is visible in AI answers (ChatGPT, Claude, Perplexity, Gemini, etc.).
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "meta-externalagent",
  "Amazonbot",
  "DuckAssistBot",
  "CCBot",
];

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).send("Method not allowed");
  }

  const siteUrl = getRequestSiteUrl(req);
  // Note: a UA-specific group REPLACES the "*" group for that crawler, so each
  // AI-crawler group must repeat the /api/ and /admin/ disallows itself.
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    "Disallow: /admin/",
    "",
    ...AI_CRAWLERS.flatMap((agent) => [
      `User-agent: ${agent}`,
      "Allow: /",
      "Disallow: /api/",
      "Disallow: /admin/",
      "",
    ]),
    `Sitemap: ${siteUrl}/sitemap.xml`,
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

  return res.status(200).send(body);
}
