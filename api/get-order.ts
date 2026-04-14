import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { getOrderAccessSecret, isValidOrderAccessToken } from "./_lib/orderAccess.js";

/**
 * Vercel API route: GET /api/get-order?id=<orderId>
 *
 * Fetches order data using the service role key (bypasses RLS).
 * Used by the checkout confirmation page for guest orders where
 * RLS blocks anon reads (null = null is false in SQL).
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const orderId = req.query.id as string;
  const token = req.query.token as string | undefined;
  if (!orderId || !token) {
    return res.status(400).json({ error: "Order ID and access token are required" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_Secret_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing Supabase configuration" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const accessSecret = getOrderAccessSecret();

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, user_id, guest_email, line_items, shipping_address, total_price, shipping_cost, currency_code, financial_status, fulfillment_status, created_at, updated_at, notes")
    .eq("id", orderId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Order not found" });
  }

  const ownerRef = data.user_id || data.guest_email;
  if (!ownerRef || !isValidOrderAccessToken(orderId, ownerRef, token, accessSecret)) {
    return res.status(404).json({ error: "Order not found" });
  }

  res.setHeader("Cache-Control", "no-store");

  return res.status(200).json({
    id: data.id,
    order_number: data.order_number,
    line_items: data.line_items,
    shipping_address: data.shipping_address,
    total_price: data.total_price,
    shipping_cost: data.shipping_cost,
    currency_code: data.currency_code,
    financial_status: data.financial_status,
    fulfillment_status: data.fulfillment_status,
    created_at: data.created_at,
    updated_at: data.updated_at,
    notes: data.notes,
  });
}
