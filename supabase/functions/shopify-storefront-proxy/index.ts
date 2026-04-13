// Shopify Storefront API proxy
// Routes GraphQL requests through the backend to avoid production CORS/origin/env mismatches.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SHOPIFY_API_VERSION = "2025-07";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const storefrontToken = Deno.env.get("SHOPIFY_STOREFRONT_ACCESS_TOKEN");
    if (!storefrontToken) {
      return new Response(JSON.stringify({ error: "Missing SHOPIFY_STOREFRONT_ACCESS_TOKEN" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prefer env override, fallback to known store domain for this project.
    const storeDomain =
      Deno.env.get("SHOPIFY_STORE_DOMAIN") ??
      Deno.env.get("SHOPIFY_STORE_PERMANENT_DOMAIN") ??
      "lovable-project-mrc80.myshopify.com";

    const { query, variables } = (await req.json()) as {
      query?: string;
      variables?: Record<string, unknown>;
    };

    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "Missing GraphQL query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstream = await fetch(
      `https://${storeDomain}/api/${SHOPIFY_API_VERSION}/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": storefrontToken,
        },
        body: JSON.stringify({ query, variables: variables ?? {} }),
      },
    );

    const text = await upstream.text();

    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Proxy error", message: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
