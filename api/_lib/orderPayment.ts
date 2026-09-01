import type { SupabaseClient } from "@supabase/supabase-js";
import { createOrderAccessToken, getOrderAccessSecret } from "./orderAccess.js";
import { sendOrderConfirmationEmail } from "./orderConfirmationEmail.js";

/**
 * Shared "mark paid → side effects" path used by both the PayPlus server
 * callback and the browser-return IPN check. All state transitions go through
 * the mark_order_paid() Postgres function, which is atomic and idempotent.
 */

export interface PaidTransactionFacts {
  provider: string;
  transactionUid: string | null;
  pageRequestUid: string | null;
  amount: number;
  currency: string;
  statusCode: string | null;
  method: string | null;
  cardBrand: string | null;
  cardLast4: string | null;
  approvalNumber: string | null;
  raw: unknown;
}

export class PermanentPaymentError extends Error {}

/**
 * Runs mark_order_paid(). Returns { updated } — updated=false means the order
 * was already paid (idempotent replay). Throws PermanentPaymentError for
 * mismatches that a retry can never fix (wrong amount, wrong page uid, bad
 * state), and a plain Error for transient/database failures.
 */
export async function markOrderPaid(
  supabase: SupabaseClient,
  orderId: string,
  facts: PaidTransactionFacts
): Promise<{ updated: boolean; orderNumber: number | null; customerEmail: string | null; userId: string | null }> {
  const { data, error } = await supabase.rpc("mark_order_paid", {
    p_order_id: orderId,
    p_provider: facts.provider,
    p_txn_id: facts.transactionUid,
    p_page_request_uid: facts.pageRequestUid,
    p_amount: facts.amount,
    p_currency: facts.currency,
    p_status_raw: facts.statusCode,
    p_method: facts.method,
    p_card_brand: facts.cardBrand,
    p_card_last4: facts.cardLast4,
    p_approval: facts.approvalNumber,
    p_raw: facts.raw ?? null,
  });

  if (error) {
    const message = error.message || "";
    const permanent =
      message.includes("amount mismatch") ||
      message.includes("invalid transition") ||
      message.includes("page_request_uid mismatch") ||
      message.includes("not found");
    if (permanent) throw new PermanentPaymentError(message);
    throw new Error(`mark_order_paid failed: ${message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    updated: Boolean(row?.updated),
    orderNumber: row?.order_number ?? null,
    customerEmail: row?.customer_email ?? null,
    userId: row?.user_id ?? null,
  };
}

/**
 * Sends the branded confirmation email exactly once per order. Never throws —
 * email failure must not fail the payment callback (the order IS paid).
 */
export async function sendPaidOrderEmail(
  supabase: SupabaseClient,
  orderId: string,
  siteUrl: string
): Promise<void> {
  try {
    const { data: order } = await supabase
      .from("orders")
      .select(
        "id, order_number, user_id, guest_email, customer_email, line_items, shipping_address, total_price, shipping_cost, currency_code, confirmation_email_sent_at"
      )
      .eq("id", orderId)
      .single();

    if (!order || order.confirmation_email_sent_at) return;

    let to: string | null = order.customer_email || order.guest_email;
    if (!to && order.user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
      to = authUser?.user?.email ?? null;
    }
    if (!to) {
      console.error("Paid order has no reachable email:", orderId);
      return;
    }

    const ownerRef = order.user_id || order.guest_email || order.customer_email;
    const token = ownerRef ? createOrderAccessToken(order.id, ownerRef, getOrderAccessSecret()) : null;
    const confirmationUrl = token
      ? `${siteUrl}/checkout/confirmation/${order.id}?token=${encodeURIComponent(token)}`
      : `${siteUrl}/checkout/confirmation/${order.id}`;

    const result = await sendOrderConfirmationEmail({
      to,
      orderNumber: order.order_number,
      lineItems: order.line_items,
      totalPrice: order.total_price,
      shippingCost: order.shipping_cost || 0,
      currencyCode: order.currency_code || "ILS",
      shippingAddress: order.shipping_address,
      confirmationUrl,
      siteUrl,
    });

    if (result.sent) {
      await supabase
        .from("orders")
        .update({ confirmation_email_sent_at: new Date().toISOString() })
        .eq("id", orderId)
        .is("confirmation_email_sent_at", null);
    } else {
      console.error("Order confirmation email not sent:", orderId, result.reason);
    }
  } catch (error) {
    console.error("sendPaidOrderEmail failed:", orderId, error);
  }
}
