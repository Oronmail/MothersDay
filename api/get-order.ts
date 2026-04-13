import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

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
  if (!orderId) {
    return res.status(400).json({ error: "Order ID is required" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_Secret_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing Supabase configuration" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from("orders")
    .select("id, order_number, line_items, shipping_address, total_price, shipping_cost, currency_code, financial_status, fulfillment_status, created_at")
    .eq("id", orderId)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: "Order not found" });
  }

  return res.status(200).json(data);
}
