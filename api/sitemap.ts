import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { getRequestSiteUrl } from "./_lib/siteUrl.js";

type SitemapEntry = {
  path: string;
  lastmod?: string | null;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: string;
};

const STATIC_ROUTES: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/products", changefreq: "weekly", priority: "0.9" },
  { path: "/sets", changefreq: "weekly", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.7" },
  { path: "/blog", changefreq: "monthly", priority: "0.7" },
  { path: "/support", changefreq: "monthly", priority: "0.6" },
  { path: "/shipping", changefreq: "monthly", priority: "0.5" },
  { path: "/returns", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "monthly", priority: "0.3" },
  { path: "/terms", changefreq: "monthly", priority: "0.3" },
  { path: "/content-1", changefreq: "monthly", priority: "0.6" },
  { path: "/content-2", changefreq: "monthly", priority: "0.6" },
  { path: "/content-3", changefreq: "monthly", priority: "0.6" },
];

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const toAbsoluteUrl = (siteUrl: string, path: string) =>
  `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;

const toIsoDate = (value?: string | null) => {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).send("Method not allowed");
  }

  const siteUrl = getRequestSiteUrl(req);
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_Secret_KEY;

  const entries: SitemapEntry[] = [...STATIC_ROUTES];

  if (supabaseUrl && supabaseServiceKey) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const [{ data: products }, { data: collections }] = await Promise.all([
      supabase
        .from("products")
        .select("handle, updated_at")
        .eq("status", "active")
        .order("updated_at", { ascending: false }),
      supabase
        .from("collections")
        .select("handle, updated_at")
        .eq("is_published", true)
        .order("updated_at", { ascending: false }),
    ]);

    for (const product of products ?? []) {
      entries.push({
        path: `/product/${product.handle}`,
        lastmod: toIsoDate(product.updated_at),
        changefreq: "weekly",
        priority: "0.8",
      });
    }

    for (const collection of collections ?? []) {
      if (collection.handle === "הכל") continue;

      entries.push({
        path: `/collection/${collection.handle}`,
        lastmod: toIsoDate(collection.updated_at),
        changefreq: "weekly",
        priority: "0.7",
      });
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map((entry) => {
    const lines = [
      "  <url>",
      `    <loc>${escapeXml(toAbsoluteUrl(siteUrl, entry.path))}</loc>`,
    ];

    if (entry.lastmod) {
      lines.push(`    <lastmod>${entry.lastmod}</lastmod>`);
    }

    if (entry.changefreq) {
      lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    }

    if (entry.priority) {
      lines.push(`    <priority>${entry.priority}</priority>`);
    }

    lines.push("  </url>");
    return lines.join("\n");
  })
  .join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");

  return res.status(200).send(xml);
}
