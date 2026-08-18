import type { VercelRequest, VercelResponse } from "@vercel/node";

// Same-origin proxy for the data.gov.il address datasets (cities + streets).
// data.gov.il stopped sending CORS headers, so browsers can no longer call it
// directly — the checkout city/street autocomplete goes through here instead.
// Server-to-server fetches are not subject to CORS.

const CITIES_RESOURCE_ID = "b7cf8f14-64a2-4b33-8d4b-edb286fdbd37";
const STREETS_RESOURCE_ID = "a7296d1a-f8c9-4b70-96c2-6ebb4352f8e3";
const ALLOWED_RESOURCE_IDS = new Set([CITIES_RESOURCE_ID, STREETS_RESOURCE_ID]);
const API_BASE = "https://data.gov.il/api/3/action/datastore_search";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const resourceId = String(req.query.resource_id ?? "");
  if (!ALLOWED_RESOURCE_IDS.has(resourceId)) {
    return res.status(400).json({ error: "Unknown resource" });
  }

  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "500"), 10) || 500, 1), 1000);
  const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);

  const params = new URLSearchParams({
    resource_id: resourceId,
    limit: String(limit),
    offset: String(offset),
  });

  // Only the street lookup passes filters, always of the form {"סמל_ישוב": <number>}
  if (typeof req.query.filters === "string" && req.query.filters) {
    try {
      const filters = JSON.parse(req.query.filters) as Record<string, unknown>;
      const cityCode = Number(filters["סמל_ישוב"]);
      if (!Number.isFinite(cityCode)) {
        return res.status(400).json({ error: "Invalid filters" });
      }
      params.set("filters", JSON.stringify({ "סמל_ישוב": cityCode }));
    } catch {
      return res.status(400).json({ error: "Invalid filters" });
    }
  }

  try {
    const response = await fetch(`${API_BASE}?${params}`);
    if (!response.ok) {
      return res.status(502).json({ error: "Upstream error" });
    }
    const data = await response.json();

    // Public, rarely-changing data: cache hard on the Vercel edge, and allow
    // any origin (lets local dev call the production endpoint too).
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");

    return res.status(200).json(data);
  } catch {
    return res.status(502).json({ error: "Upstream unreachable" });
  }
}
