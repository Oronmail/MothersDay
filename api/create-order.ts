import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { canSubmitCheckout } from "./_lib/checkout.js";
import { createOrderAccessToken, getOrderAccessSecret } from "./_lib/orderAccess.js";

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

  if (!canSubmitCheckout()) {
    return res.status(503).json({ error: "Checkout is currently disabled" });
  }

  const { items, email, shippingAddress, shippingCost, userId, notes } = req.body as {
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
    notes?: string;
  };

  if (!items || !email || !shippingAddress) {
    return res.status(400).json({ error: "items, email, and shippingAddress are required" });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "At least one line item is required" });
  }

  const hasInvalidQuantity = items.some(
    (item) => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 20
  );
  if (hasInvalidQuantity) {
    return res.status(400).json({ error: "Item quantities must be whole numbers between 1 and 20" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_Secret_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing Supabase configuration" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Validate every variant against the database and use only server-side pricing.
  const variantIds = [...new Set(items.map((item) => item.variant_id))];
  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, product_id, price, available_for_sale")
    .in("id", variantIds);

  const priceMap = new Map(
    (
      variants ?? []
    ).map((variant: {
      id: string;
      product_id: string;
      price: number;
      available_for_sale: boolean;
    }) => [variant.id, variant])
  );

  const hasInvalidVariant = items.some((item) => {
    const variant = priceMap.get(item.variant_id);
    return (
      !variant ||
      variant.product_id !== item.product_id ||
      !variant.available_for_sale
    );
  });

  if (hasInvalidVariant) {
    return res.status(400).json({ error: "One or more cart items are no longer available" });
  }

  const verifiedItems = items.map((item) => {
    const variant = priceMap.get(item.variant_id);
    return {
      ...item,
      price: String(variant!.price),
    };
  });

  const itemsTotal = verifiedItems.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  // Server-side shipping cost validation: recompute from store_settings
  let validatedShippingCost = 0;
  try {
    const { data: settingsRows } = await supabase
      .from("store_settings")
      .select("key, value");
    const settingsMap = new Map(
      (settingsRows ?? []).map((row: { key: string; value: string | number | boolean | null }) => [
        row.key,
        row.value,
      ])
    );
    const enabled = Boolean(settingsMap.get("shipping_enabled") ?? true);
    const cost = Number(settingsMap.get("shipping_cost") ?? 35);
    const threshold = Number(settingsMap.get("free_shipping_threshold") ?? 350);
    validatedShippingCost = enabled ? (itemsTotal >= threshold ? 0 : cost) : 0;
  } catch {
    // Fallback to client-provided value if settings read fails, but clamp to non-negative
    validatedShippingCost = Math.max(0, shippingCost ?? 0);
  }

  const totalPrice = itemsTotal + validatedShippingCost;
  const orderOwnerRef = userId || email.trim().toLowerCase();

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
        line_items: verifiedItems,
        shipping_address: { ...shippingAddress, phone },
        total_price: totalPrice,
        shipping_cost: validatedShippingCost,
        currency_code: "ILS",
        financial_status: "pending",
        fulfillment_status: "unfulfilled",
        notes: notes || null,
      })
      .select("id, order_number")
      .single();

    if (error) throw error;

    const orderAccessToken = createOrderAccessToken(
      data.id,
      orderOwnerRef,
      getOrderAccessSecret()
    );

    return res.status(200).json({
      orderId: data.id,
      orderNumber: data.order_number,
      orderAccessToken,
    });
  } catch (error) {
    console.error("Order creation failed:", error);
    return res.status(500).json({ error: "Failed to create order" });
  }
}
