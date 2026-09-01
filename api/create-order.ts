import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { canSubmitCheckout } from "./_lib/checkout.js";
import { createOrderAccessToken, getOrderAccessSecret } from "./_lib/orderAccess.js";

/**
 * POST /api/create-order
 *
 * Creates an order with the service role (RLS blocks anon order writes).
 * Everything money-related is recomputed server-side:
 *  - prices and titles come from product_variants/products, never the client
 *  - shipping is recomputed from store_settings
 *  - the owning user comes from the caller's Supabase JWT (Authorization
 *    header), never from the request body
 */

const phoneSchema = z
  .string()
  .transform((value) => {
    let digits = value.replace(/[^\d+]/g, "");
    if (digits.startsWith("+972")) digits = `0${digits.slice(4)}`;
    else if (digits.startsWith("972")) digits = `0${digits.slice(3)}`;
    return digits;
  })
  .refine((digits) => /^0\d{8,9}$/.test(digits), "invalid phone");

const orderSchema = z.object({
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        variant_id: z.string().uuid(),
        quantity: z.number().int().min(1).max(20),
      })
    )
    .min(1)
    .max(30),
  email: z.string().trim().email().max(254),
  shippingAddress: z.object({
    full_name: z.string().trim().min(2).max(120),
    city: z.string().trim().min(2).max(120),
    street: z.string().trim().min(2).max(200),
    house_number: z.string().trim().max(20).optional(),
    apartment: z.string().trim().max(20).optional(),
    postal_code: z.string().trim().max(12).optional(),
    phone: phoneSchema.optional(),
  }),
  notes: z.string().trim().max(1000).optional(),
  // Ignored (kept so older clients don't fail validation): the server recomputes
  // shipping and derives the user from the JWT.
  shippingCost: z.unknown().optional(),
  userId: z.unknown().optional(),
});

type ProductTitleRef = { title: string | null };
type VariantRow = {
  id: string;
  product_id: string;
  price: number;
  available_for_sale: boolean;
  title: string | null;
  // supabase-js types to-one embeds as arrays; runtime is an object.
  products: ProductTitleRef | ProductTitleRef[] | null;
};

const productTitleOf = (variant: VariantRow): string | null => {
  const ref = Array.isArray(variant.products) ? variant.products[0] : variant.products;
  return ref?.title ?? null;
};

const ORDER_EXPIRY_HOURS = 2;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!canSubmitCheckout()) {
    return res.status(503).json({ error: "Checkout is currently disabled" });
  }

  const parsed = orderSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return res.status(400).json({
      error: "invalid_order",
      message: first ? `${first.path.join(".")}: ${first.message}` : "invalid order",
    });
  }
  const { items, email, shippingAddress, notes } = parsed.data;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_Secret_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing Supabase configuration" });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  // The owning user comes only from a verified JWT.
  let userId: string | null = null;
  let userEmail: string | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const { data: authData } = await supabase.auth.getUser(authHeader.slice(7));
    if (authData?.user) {
      userId = authData.user.id;
      userEmail = authData.user.email ?? null;
    }
  }

  // Validate every variant and rebuild the line items purely from the database.
  const variantIds = [...new Set(items.map((item) => item.variant_id))];
  const { data: variantRows, error: variantError } = await supabase
    .from("product_variants")
    .select("id, product_id, price, available_for_sale, title, products(title)")
    .in("id", variantIds);

  if (variantError) {
    console.error("create-order: variant lookup failed", variantError);
    return res.status(500).json({ error: "Failed to validate cart items" });
  }

  const variantMap = new Map(((variantRows ?? []) as unknown as VariantRow[]).map((v) => [v.id, v]));
  for (const item of items) {
    const variant = variantMap.get(item.variant_id);
    if (!variant || variant.product_id !== item.product_id || !variant.available_for_sale) {
      return res.status(400).json({
        error: "items_unavailable",
        message: "One or more cart items are no longer available",
      });
    }
  }

  // First image per product, for the order-history thumbnails.
  const productIds = [...new Set(items.map((item) => item.product_id))];
  const { data: imageRows } = await supabase
    .from("product_images")
    .select("product_id, url, position")
    .in("product_id", productIds)
    .order("position");
  const imageMap = new Map<string, string>();
  for (const row of imageRows ?? []) {
    if (!imageMap.has(row.product_id)) imageMap.set(row.product_id, row.url);
  }

  const verifiedItems = items.map((item) => {
    const variant = variantMap.get(item.variant_id)!;
    const productTitle = productTitleOf(variant) || "פריט";
    const title =
      variant.title && variant.title !== "Default Title"
        ? `${productTitle} — ${variant.title}`
        : productTitle;
    return {
      title,
      quantity: item.quantity,
      price: String(variant.price),
      image: imageMap.get(item.product_id) || "",
      product_id: item.product_id,
      variant_id: item.variant_id,
    };
  });

  // Integer agorot to avoid float drift.
  const subtotalAgorot = verifiedItems.reduce(
    (sum, item) => sum + Math.round(parseFloat(item.price) * 100) * item.quantity,
    0
  );

  let shippingAgorot = 0;
  const { data: settingsRows } = await supabase.from("store_settings").select("key, value");
  const settings = new Map((settingsRows ?? []).map((row: { key: string; value: unknown }) => [row.key, row.value]));
  const shippingEnabled = Boolean(settings.get("shipping_enabled") ?? true);
  if (shippingEnabled) {
    const cost = Number(settings.get("shipping_cost") ?? 35);
    const threshold = Number(settings.get("free_shipping_threshold") ?? 350);
    shippingAgorot = subtotalAgorot >= Math.round(threshold * 100) ? 0 : Math.round(cost * 100);
  }

  const subtotal = subtotalAgorot / 100;
  const shippingCost = shippingAgorot / 100;
  const totalPrice = (subtotalAgorot + shippingAgorot) / 100;

  const normalizedEmail = email.toLowerCase();
  const customerEmail = userId ? (userEmail ?? normalizedEmail) : normalizedEmail;
  const orderOwnerRef = userId || normalizedEmail;

  let phone = shippingAddress.phone || "";
  if (phone.startsWith("0")) phone = `+972${phone.slice(1)}`;

  const baseRow = {
    user_id: userId,
    guest_email: userId ? null : normalizedEmail,
    line_items: verifiedItems,
    shipping_address: { ...shippingAddress, phone },
    total_price: totalPrice,
    shipping_cost: shippingCost,
    currency_code: "ILS",
    financial_status: "pending",
    fulfillment_status: "unfulfilled",
    notes: notes || null,
  };
  const extendedRow = {
    ...baseRow,
    customer_email: customerEmail,
    subtotal,
    expires_at: new Date(Date.now() + ORDER_EXPIRY_HOURS * 3600_000).toISOString(),
    // The Zod-validated checkout form requires the terms checkbox; the order
    // records when that consent was given.
    terms_accepted_at: new Date().toISOString(),
  };

  try {
    // Prefer the post-migration shape; fall back if the payment columns
    // haven't been applied yet (PostgREST PGRST204 / Postgres 42703 = unknown column).
    let insert = await supabase.from("orders").insert(extendedRow).select("id, order_number").single();
    if (insert.error?.code === "PGRST204" || insert.error?.code === "42703") {
      insert = await supabase.from("orders").insert(baseRow).select("id, order_number").single();
    }
    if (insert.error || !insert.data) throw insert.error ?? new Error("insert returned no row");

    const orderAccessToken = createOrderAccessToken(insert.data.id, orderOwnerRef, getOrderAccessSecret());

    return res.status(200).json({
      orderId: insert.data.id,
      orderNumber: insert.data.order_number,
      orderAccessToken,
    });
  } catch (error) {
    console.error("Order creation failed:", error);
    return res.status(500).json({ error: "Failed to create order" });
  }
}
