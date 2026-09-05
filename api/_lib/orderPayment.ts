import type { SupabaseClient } from "@supabase/supabase-js";
import { createOrderAccessToken, getOrderAccessSecret } from "./orderAccess.js";
import { recordDiscountUsage } from "./discounts.js";
import { sendOrderConfirmationEmail } from "./orderConfirmationEmail.js";
import { createInvoiceDocument, getInvoiceMode, getPayPlusConfig } from "./payplus.js";
import { collectLowStockForOrder, parseAlertEmails, stampLowStockAlerted } from "./inventory.js";
import { sendNewOrderAdminEmail, type AdminOrderEmailItem } from "./newOrderAdminEmail.js";

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
  // Refresh the coupon's admin usage counter on the first paid transition
  // (all mark-paid paths funnel through here). Best-effort, never throws.
  if (row?.updated) await recordDiscountUsage(supabase, orderId);
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
    // Negative discount row keeps the items sum equal to the charged amount.
    const discountAmount = Number(order.discount_amount ?? 0);
    if (discountAmount > 0) {
      items.push({
        name: order.discount_code ? `הנחה (${order.discount_code})` : "הנחה",
        quantity: 1,
        price: -discountAmount,
      });
    }

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
      discountCode: order.discount_code ?? null,
      discountAmount: Number(order.discount_amount ?? 0),
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

/**
 * "הזמנה חדשה" to the owners (ORDER_ALERT_EMAILS), once per paid order
 * (orders.admin_notified_at). Carries the low-stock items this order caused,
 * then stamps them so they alert again only after a restock. Never throws.
 */
export async function notifyOwnersOfPaidOrder(
  supabase: SupabaseClient,
  orderId: string,
  siteUrl: string,
  options: { simulated?: boolean } = {},
): Promise<void> {
  try {
    const recipients = parseAlertEmails(process.env.ORDER_ALERT_EMAILS);
    if (recipients.length === 0) {
      console.warn("notifyOwnersOfPaidOrder: ORDER_ALERT_EMAILS is not set — no owners' email sent");
      return;
    }

    const { data: order } = await supabase.from("orders").select("*").eq("id", orderId).single();
    if (!order || order.financial_status !== "paid" || order.admin_notified_at) return;

    const lineItems = (Array.isArray(order.line_items) ? order.line_items : []) as Array<{
      title?: string; quantity?: number; price?: string | number; product_id?: string;
    }>;

    // Kit recipes for the packer's eyes (one query for all kits in the order).
    const productIds = [...new Set(lineItems.map((i) => i.product_id).filter((id): id is string => Boolean(id)))];
    const { data: kitRows } = productIds.length
      ? await supabase
          .from("bundle_items")
          .select("bundle_id, quantity, product:product_id(title)")
          .in("bundle_id", productIds)
      : { data: [] as unknown[] };
    const partsByKit = new Map<string, Array<{ title: string; quantity: number }>>();
    for (const row of (kitRows ?? []) as Array<{ bundle_id: string; quantity: number | null; product: { title: string } | { title: string }[] | null }>) {
      const product = Array.isArray(row.product) ? row.product[0] : row.product;
      if (!product) continue;
      partsByKit.set(row.bundle_id, [
        ...(partsByKit.get(row.bundle_id) ?? []),
        { title: product.title, quantity: row.quantity ?? 1 },
      ]);
    }

    const items: AdminOrderEmailItem[] = lineItems.map((i) => ({
      title: i.title || "פריט",
      quantity: Math.max(1, Math.trunc(i.quantity ?? 1)),
      price: Number(i.price ?? 0),
      parts: i.product_id ? partsByKit.get(i.product_id) : undefined,
    }));

    const lowStock = await collectLowStockForOrder(supabase, orderId);
    const address = (order.shipping_address ?? {}) as { full_name?: string; phone?: string; city?: string };

    const result = await sendNewOrderAdminEmail({
      to: recipients,
      orderNumber: order.order_number,
      customerName: address.full_name?.trim() || null,
      customerEmail: order.customer_email || order.guest_email || null,
      customerPhone: address.phone || null,
      city: address.city || null,
      items,
      subtotal: order.subtotal != null ? Number(order.subtotal) : null,
      discountCode: order.discount_code ?? null,
      discountAmount: Number(order.discount_amount ?? 0),
      shippingCost: Number(order.shipping_cost ?? 0),
      total: Number(order.paid_amount ?? order.total_price),
      paymentMethod: order.payment_method ?? null,
      cardLast4: order.card_last4 ?? null,
      adminUrl: `${siteUrl}/admin/orders/${order.id}`,
      lowStock,
      simulated: Boolean(options.simulated),
    });

    if (result.sent) {
      await supabase
        .from("orders")
        .update({ admin_notified_at: new Date().toISOString() })
        .eq("id", orderId)
        .is("admin_notified_at", null);
      if (lowStock.length) await stampLowStockAlerted(supabase, lowStock);
    } else {
      console.error("Owners' new-order email not sent:", orderId, result.reason);
    }
  } catch (error) {
    console.error("notifyOwnersOfPaidOrder failed:", orderId, error);
  }
}
