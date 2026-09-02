import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { evaluateCoupon, normalizeCouponCode } from "./_lib/discounts.js";

/**
 * POST /api/validate-coupon
 *
 * Live coupon check for the checkout page: recomputes the cart from the
 * database (prices + bundle flags, never the client's numbers) and returns the
 * discount the code would give. Advisory only — /api/create-order re-runs the
 * same evaluation and is the one that counts.
 */

const requestSchema = z.object({
  couponCode: z.string().trim().min(1).max(40),
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
  email: z.string().trim().email().max(254).optional(),
});

type VariantRow = {
  id: string;
  product_id: string;
  price: number;
  products: { is_bundle: boolean | null } | { is_bundle: boolean | null }[] | null;
};

const isBundleOf = (variant: VariantRow): boolean => {
  const ref = Array.isArray(variant.products) ? variant.products[0] : variant.products;
  return Boolean(ref?.is_bundle);
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parsed = requestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ valid: false, reason: "invalid_request", message: "בקשה לא תקינה" });
  }
  const { couponCode, items, email } = parsed.data;

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_Secret_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing Supabase configuration" });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  // Logged-in customers are recognized by their JWT (for the first-order check).
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

  const variantIds = [...new Set(items.map((item) => item.variant_id))];
  const { data: variantRows, error: variantError } = await supabase
    .from("product_variants")
    .select("id, product_id, price, products(is_bundle)")
    .in("id", variantIds);
  if (variantError) {
    console.error("validate-coupon: variant lookup failed", variantError);
    return res.status(500).json({ error: "Failed to validate cart items" });
  }

  const variantMap = new Map(
    ((variantRows ?? []) as unknown as VariantRow[]).map((v) => [v.id, v])
  );
  const couponItems = [];
  for (const item of items) {
    const variant = variantMap.get(item.variant_id);
    if (!variant || variant.product_id !== item.product_id) {
      return res.status(400).json({
        valid: false,
        reason: "items_unavailable",
        message: "אחד המוצרים בעגלה כבר לא זמין",
      });
    }
    couponItems.push({
      priceAgorot: Math.round(Number(variant.price) * 100),
      quantity: item.quantity,
      isBundle: isBundleOf(variant),
    });
  }

  try {
    const result = await evaluateCoupon(supabase, couponCode, couponItems, {
      userId,
      email: userEmail ?? email ?? null,
    });

    if (!result.ok) {
      return res.status(400).json({ valid: false, reason: result.reason, message: result.message });
    }

    return res.status(200).json({
      valid: true,
      code: normalizeCouponCode(couponCode),
      discountAmount: result.discountAgorot / 100,
      eligibleSubtotal: result.eligibleAgorot / 100,
      description: result.discount.description,
    });
  } catch (error) {
    console.error("validate-coupon failed:", error);
    return res.status(500).json({ error: "Failed to validate coupon" });
  }
}
