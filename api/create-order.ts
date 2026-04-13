import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

/**
 * Vercel API route: POST /api/create-order
 *
 * Creates an order in Supabase using the service role key (bypasses RLS).
 * This avoids RLS issues with the anon/publishable key for guest checkout.
 *
 * Required env vars:
 *   VITE_SUPABASE_URL    — Supabase project URL
 *   SUPABASE_Secret_KEY  — Supabase service role key (server-side only)
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { items, email, shippingAddress, shippingCost, userId } = req.body as {
    items: Array<{
      title: string;
      quantity: number;
      price: string;
      image: string;
      product_id: string;
      variant_id: string;
    }>;
    email: string;
    shippingAddress: {
      full_name: string;
      street: string;
      city: string;
      house_number?: string;
      apartment?: string;
      postal_code?: string;
      phone?: string;
    };
    shippingCost?: number;
    userId?: string;
  };

  if (!items || !email || !shippingAddress) {
    return res.status(400).json({ error: "items, email, and shippingAddress are required" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_Secret_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing Supabase configuration" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const itemsTotal = items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  // Server-side shipping cost validation: recompute from store_settings
  let validatedShippingCost = 0;
  try {
    const { data: settingsRows } = await supabase
      .from("store_settings")
      .select("key, value");
    const settingsMap = new Map((settingsRows ?? []).map((r: any) => [r.key, r.value]));
    const enabled = Boolean(settingsMap.get("shipping_enabled") ?? true);
    const cost = Number(settingsMap.get("shipping_cost") ?? 35);
    const threshold = Number(settingsMap.get("free_shipping_threshold") ?? 350);
    validatedShippingCost = enabled ? (itemsTotal >= threshold ? 0 : cost) : 0;
  } catch {
    // Fallback to client-provided value if settings read fails, but clamp to non-negative
    validatedShippingCost = Math.max(0, shippingCost ?? 0);
  }

  const totalPrice = itemsTotal + validatedShippingCost;

  let phone = shippingAddress.phone || "";
  if (phone.startsWith("0")) {
    phone = "+972" + phone.slice(1);
  }

  try {
    const { data, error } = await supabase
      .from("orders")
      .insert({
        user_id: userId || null,
        guest_email: userId ? null : email,
        line_items: items,
        shipping_address: { ...shippingAddress, phone },
        total_price: totalPrice,
        shipping_cost: validatedShippingCost,
        currency_code: "ILS",
        financial_status: "pending",
        fulfillment_status: "unfulfilled",
      })
      .select("id, order_number")
      .single();

    if (error) throw error;

    return res.status(200).json({
      orderId: data.id,
      orderNumber: data.order_number,
    });
  } catch (error) {
    console.error("Order creation failed:", error);
    return res.status(500).json({ error: "Failed to create order" });
  }
}
