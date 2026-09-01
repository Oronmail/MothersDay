import type { SupabaseClient } from "@supabase/supabase-js";
import { createOrderAccessToken, getOrderAccessSecret } from "./orderAccess.js";
import { sendOrderConfirmationEmail } from "./orderConfirmationEmail.js";
import { createInvoiceDocument, getInvoiceMode, getPayPlusConfig } from "./payplus.js";

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
 * Invoice+ "api" mode: create the tax invoice/receipt for a just-paid order and
 * store its number/URL on the row. Runs once per order (guarded by the
 * invoice_number already being set + PayPlus's unique_identifier dedupe).
 * Never throws — a failed invoice must not fail the payment flow; the document
 * can always be issued manually from the PayPlus panel.
 */
export async function createAndStoreInvoice(supabase: SupabaseClient, orderId: string): Promise<void> {
  if (getInvoiceMode() !== "api") return;
  try {
    const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (!order || order.financial_status !== "paid" || !order.provider_transaction_id) return;
    if (order.invoice_number || order.invoice_url) return; // already issued

    let email: string | null = order.customer_email || order.guest_email;
    if (!email && order.user_id) {
      const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
      email = authUser?.user?.email ?? null;
    }
    if (!email) return;

    const lineItems = (Array.isArray(order.line_items) ? order.line_items : []) as Array<{
      title?: string;
      quantity?: number;
      price?: string;
    }>;
    const items = lineItems.map((item) => ({
      name: item.title || "פריט",
      quantity: Math.max(1, Math.trunc(item.quantity ?? 1)),
      price: Number(item.price ?? 0),
    }));
    const shippingCost = Number(order.shipping_cost ?? 0);
    if (shippingCost > 0) items.push({ name: "משלוח", quantity: 1, price: shippingCost });

    const shippingAddress = (order.shipping_address ?? {}) as { full_name?: string };
    const invoice = await createInvoiceDocument(getPayPlusConfig(), {
      transactionUid: order.provider_transaction_id,
      uniqueIdentifier: order.id,
      orderNumber: order.order_number,
      amount: Number(order.paid_amount ?? order.total_price),
      customer: { name: shippingAddress.full_name || "", email },
      items,
      paymentDate: order.paid_at ? new Date(order.paid_at) : new Date(),
      cardLast4: order.card_last4 ?? null,
      cardBrand: order.card_brand ?? null,
    });

    // Audit row (also captures the raw response while the integration is young).
    await supabase.from("payment_events").insert({
      order_id: orderId,
      provider: "payplus",
      event_key: `invoice:${orderId}`,
      event_type: "InvoiceCreate",
      status_code: invoice.number ? "ok" : "no_number",
      amount: Number(order.paid_amount ?? order.total_price),
      currency: "ILS",
      verified: true,
      payload: invoice.raw ?? {},
    });

    if (invoice.number || invoice.url) {
      const { error } = await supabase
        .from("orders")
        .update({ invoice_number: invoice.number, invoice_url: invoice.url })
        .eq("id", orderId);
      if (error && error.code !== "PGRST204" && error.code !== "42703") {
        console.error("createAndStoreInvoice: store failed", orderId, error);
      }
    } else {
      console.error("createAndStoreInvoice: no document in response", orderId, JSON.stringify(invoice.raw).slice(0, 400));
    }
  } catch (error) {
    console.error("createAndStoreInvoice failed:", orderId, error);
    // Failure audit row — a silent invoice failure cost us a debugging round
    // on 2026-09-01; never again.
    await supabase
      .from("payment_events")
      .insert({
        order_id: orderId,
        provider: "payplus",
        event_key: `invoice-failed:${orderId}:${Date.now()}`,
        event_type: "InvoiceCreate",
        status_code: "error",
        verified: false,
        payload: { error: error instanceof Error ? error.message : String(error) },
      })
      .then(({ error: auditError }) => {
        if (auditError) console.error("invoice failure audit insert failed:", auditError);
      });
  }
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
    // select("*") so a not-yet-applied optional column (e.g. invoice_url)
    // can never break the email path.
    const { data: order } = await supabase
      .from("orders")
      .select("*")
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
      invoiceUrl: order.invoice_url ?? null,
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
