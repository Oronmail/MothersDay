import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Coupon validation + computation, shared by /api/validate-coupon (live checkout
 * UX) and /api/create-order (the authoritative application). All money in
 * integer agorot, mirroring create-order's arithmetic.
 *
 * Enforcement notes:
 *  - max_uses counts PAID orders carrying the code (orders are the source of
 *    truth; discounts.used_count is only refreshed best-effort for the admin).
 *  - first_order_only: a guest is recognized by email; a different email would
 *    slip through. Accepted risk at a 10% welcome-code level.
 */

export type DiscountRow = {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  first_order_only: boolean;
  expires_at: string | null;
  is_active: boolean;
  description: string | null;
};

export type CouponItem = {
  priceAgorot: number;
  quantity: number;
  isBundle: boolean;
};

export type CouponCustomer = {
  userId: string | null;
  email: string | null;
};

export type CouponRejectionReason =
  | "invalid_code"
  | "expired"
  | "exhausted"
  | "min_order"
  | "first_order_only"
  | "bundles_only";

export type CouponEvaluation =
  | {
      ok: true;
      discount: DiscountRow;
      discountAgorot: number;
      eligibleAgorot: number;
    }
  | { ok: false; reason: CouponRejectionReason; message: string };

export const normalizeCouponCode = (raw: string): string => raw.trim().toUpperCase();

const reject = (reason: CouponRejectionReason, message: string): CouponEvaluation => ({
  ok: false,
  reason,
  message,
});

/** Paid orders that already used this code (authoritative usage count). */
async function countPaidUses(supabase: SupabaseClient, code: string): Promise<number> {
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("discount_code", code)
    .eq("financial_status", "paid");
  if (error) throw new Error(`coupon usage count failed: ${error.message}`);
  return count ?? 0;
}

/** Does this customer already have a paid order (by user id or by email)? */
async function hasPaidOrder(
  supabase: SupabaseClient,
  customer: CouponCustomer
): Promise<boolean> {
  if (customer.userId) {
    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("user_id", customer.userId)
      .eq("financial_status", "paid");
    if (error) throw new Error(`first-order check failed: ${error.message}`);
    if ((count ?? 0) > 0) return true;
  }
  const email = customer.email?.trim().toLowerCase();
  if (email) {
    for (const column of ["customer_email", "guest_email"] as const) {
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .ilike(column, email)
        .eq("financial_status", "paid");
      if (error) throw new Error(`first-order check failed: ${error.message}`);
      if ((count ?? 0) > 0) return true;
    }
  }
  return false;
}

export async function evaluateCoupon(
  supabase: SupabaseClient,
  rawCode: string,
  items: CouponItem[],
  customer: CouponCustomer
): Promise<CouponEvaluation> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return reject("invalid_code", "קוד הקופון לא מוכר");

  // ilike with no wildcards = case-insensitive equality (codes are practically unique).
  const { data, error } = await supabase
    .from("discounts")
    .select("*")
    .ilike("code", code)
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`coupon lookup failed: ${error.message}`);

  const discount = data as DiscountRow | null;
  if (!discount || !discount.is_active) {
    return reject("invalid_code", "קוד הקופון לא מוכר");
  }
  if (discount.expires_at && new Date(discount.expires_at).getTime() < Date.now()) {
    return reject("expired", "תוקף הקוד פג");
  }
  if (discount.max_uses !== null) {
    const uses = await countPaidUses(supabase, discount.code);
    if (uses >= discount.max_uses) {
      return reject("exhausted", "הקוד כבר לא זמין");
    }
  }

  const subtotalAgorot = items.reduce((sum, item) => sum + item.priceAgorot * item.quantity, 0);
  const minAgorot = Math.round(Number(discount.min_order_amount || 0) * 100);
  if (subtotalAgorot < minAgorot) {
    return reject("min_order", `הקוד תקף להזמנות מעל ₪${Number(discount.min_order_amount)}`);
  }

  if (discount.first_order_only && (await hasPaidOrder(supabase, customer))) {
    return reject("first_order_only", "הקוד תקף להזמנה הראשונה בלבד");
  }

  // The welcome promise says "לא כולל מארזים" — bundles never take the discount.
  const eligibleAgorot = items.reduce(
    (sum, item) => sum + (item.isBundle ? 0 : item.priceAgorot * item.quantity),
    0
  );
  if (eligibleAgorot <= 0) {
    return reject("bundles_only", "הקוד לא חל על מארזים");
  }

  const discountAgorot =
    discount.discount_type === "percentage"
      ? Math.round((eligibleAgorot * Number(discount.discount_value)) / 100)
      : Math.min(Math.round(Number(discount.discount_value) * 100), eligibleAgorot);
  if (discountAgorot <= 0) {
    return reject("invalid_code", "קוד הקופון לא מוכר");
  }

  return { ok: true, discount, discountAgorot, eligibleAgorot };
}

/**
 * Refresh discounts.used_count for the admin screen after an order using the
 * code is paid. Display-only (enforcement counts orders directly), so a
 * read-then-write race is acceptable. Never throws.
 */
export async function recordDiscountUsage(
  supabase: SupabaseClient,
  orderId: string
): Promise<void> {
  try {
    const { data: order } = await supabase
      .from("orders")
      .select("discount_code")
      .eq("id", orderId)
      .single();
    const code = order?.discount_code;
    if (!code) return;

    const uses = await countPaidUses(supabase, code);
    const { error } = await supabase
      .from("discounts")
      .update({ used_count: uses })
      .ilike("code", code);
    if (error) console.error("recordDiscountUsage: update failed", orderId, error);
  } catch (error) {
    console.error("recordDiscountUsage failed:", orderId, error);
  }
}
