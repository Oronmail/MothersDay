import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { isCheckoutEnabled } from "./_lib/checkout.js";
import { getOrderAccessSecret, isValidOrderAccessToken } from "./_lib/orderAccess.js";
import {
  generatePaymentLink,
  getPayPlusConfig,
  getPaymentBaseUrl,
  UUID_RE,
} from "./_lib/payplus.js";

/**
 * POST /api/create-payment  { orderId, orderAccessToken }
 *
 * Creates (or reuses) a PayPlus hosted-payment-page link for an existing
 * pending order and returns its URL for a full-page redirect.
 *
 * Security properties:
 *  - amount/currency/items come from the ORDER ROW, never from the client
 *  - requires the order-access token, so only the order's creator can start payment
 *  - link is reused while still valid, so refreshes don't mint duplicates
 */

// PayPlus links expire after 30 minutes; reuse ours for 25.
const LINK_REUSE_MS = 25 * 60 * 1000;

type OrderLineItem = { title?: string; quantity?: number; price?: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }
  if (!isCheckoutEnabled()) {
    return res.status(503).json({ error: "checkout_disabled" });
  }

  const { orderId, orderAccessToken } = (req.body ?? {}) as {
    orderId?: string;
    orderAccessToken?: string;
  };
  if (!orderId || !UUID_RE.test(orderId) || typeof orderAccessToken !== "string" || !orderAccessToken) {
    return res.status(400).json({ error: "invalid_request" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_Secret_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "server_misconfigured" });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  // select("*") so the endpoint also works before the payments migration
  // (unknown-column selects would fail); new fields read as undefined then.
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return res.status(404).json({ error: "order_not_found" });
  }

  const ownerRef = order.user_id || order.guest_email || order.customer_email;
  if (!ownerRef || !isValidOrderAccessToken(orderId, ownerRef, orderAccessToken, getOrderAccessSecret())) {
    // Same response as a missing order — don't leak existence.
    return res.status(404).json({ error: "order_not_found" });
  }

  if (order.financial_status === "paid") {
    return res.status(409).json({ error: "already_paid" });
  }
  if (order.financial_status !== "pending") {
    return res.status(409).json({ error: "not_payable", status: order.financial_status });
  }

  // Reuse a still-valid link so a page refresh doesn't create a new page_request_uid.
  if (order.payment_page_link && order.payment_link_created_at) {
    const age = Date.now() - new Date(order.payment_link_created_at).getTime();
    if (age >= 0 && age < LINK_REUSE_MS) {
      return res.status(200).json({
        paymentPageUrl: order.payment_page_link,
        pageRequestUid: order.payment_page_request_uid,
      });
    }
  }

  let customerEmail: string | null = order.customer_email || order.guest_email;
  if (!customerEmail && order.user_id) {
    const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
    customerEmail = authUser?.user?.email ?? null;
  }
  if (!customerEmail) {
    console.error("create-payment: order has no customer email", orderId);
    return res.status(500).json({ error: "order_missing_email" });
  }

  const shippingAddress = (order.shipping_address ?? {}) as { full_name?: string; phone?: string };
  const lineItems = (Array.isArray(order.line_items) ? order.line_items : []) as OrderLineItem[];

  const items = lineItems.map((item) => ({
    name: item.title || "פריט",
    quantity: Math.max(1, Math.trunc(item.quantity ?? 1)),
    price: Number(item.price ?? 0),
  }));
  const shippingCost = Number(order.shipping_cost ?? 0);
  if (shippingCost > 0) {
    items.push({ name: "משלוח", quantity: 1, price: shippingCost });
  }

  // PayPlus validates that item totals equal `amount`; both derive from the
  // same server-computed order row, with a rounding guard for float drift.
  const itemsTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const amount = Number(order.total_price);
  if (Math.abs(itemsTotal - amount) > 0.05) {
    console.error("create-payment: items/total mismatch", orderId, itemsTotal, amount);
    return res.status(500).json({ error: "order_total_mismatch" });
  }

  try {
    const base = getPaymentBaseUrl(req);
    const returnBase = `${base}/api/payplus-return?orderId=${encodeURIComponent(orderId)}`;

    const link = await generatePaymentLink(getPayPlusConfig(), {
      amount,
      currencyCode: order.currency_code || "ILS",
      orderId,
      orderNumber: order.order_number,
      customer: {
        name: shippingAddress.full_name || "",
        email: customerEmail,
        phone: shippingAddress.phone || undefined,
      },
      items: items.map((item, index) => ({
        ...item,
        shipping: shippingCost > 0 && index === items.length - 1,
      })),
      successUrl: returnBase,
      failureUrl: `${returnBase}&fail=1`,
      cancelUrl: `${returnBase}&cancel=1`,
      callbackUrl: `${base}/api/payplus-callback`,
    });

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_provider: "payplus",
        payment_page_request_uid: link.pageRequestUid,
        payment_page_link: link.paymentPageLink,
        payment_link_created_at: new Date().toISOString(),
        payment_attempts: (order.payment_attempts ?? 0) + 1,
      })
      .eq("id", orderId);

    if (updateError) {
      // Without the stored page_request_uid we can't verify the callback — refuse.
      console.error("create-payment: failed to store page_request_uid", orderId, updateError);
      return res.status(500).json({ error: "payment_setup_failed" });
    }

    return res.status(200).json({
      paymentPageUrl: link.paymentPageLink,
      pageRequestUid: link.pageRequestUid,
    });
  } catch (error) {
    console.error("create-payment failed:", orderId, error);
    return res.status(502).json({
      error: "payment_provider_error",
      message: "יצירת דף התשלום נכשלה. נסי שוב בעוד רגע.",
    });
  }
}
