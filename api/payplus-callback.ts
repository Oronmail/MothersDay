import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  extractCallbackInvoice,
  extractCallbackTransaction,
  getPayPlusConfig,
  getPaymentBaseUrl,
  sha256Hex,
  verifyCallbackSignature,
  UUID_RE,
} from "./_lib/payplus.js";
import { createAndStoreInvoice, markOrderPaid, PermanentPaymentError, sendPaidOrderEmail } from "./_lib/orderPayment.js";

/**
 * POST /api/payplus-callback — PayPlus server-to-server callback (refURL_callback).
 *
 * THE ONLY place an order becomes paid (besides the IPN check on return).
 * Trust model:
 *   1. HMAC-SHA256 of the RAW body against the `hash` header (secret key)
 *   2. idempotency via payment_events (provider, event_key) unique constraint
 *   3. atomic state transition + amount verification inside mark_order_paid()
 * The browser redirect never marks anything paid.
 */

// Raw body needed for the HMAC — disable Vercel's body parser.
export const config = { api: { bodyParser: false } };

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function recordEvent(
  supabase: SupabaseClient,
  event: {
    orderId: string | null;
    eventKey: string;
    eventType: string | null;
    statusCode: string | null;
    amount: number | null;
    currency: string | null;
    verified: boolean;
    payload: unknown;
  }
): Promise<"inserted" | "duplicate" | "failed"> {
  const { error } = await supabase.from("payment_events").insert({
    order_id: event.orderId,
    provider: "payplus",
    event_key: event.eventKey,
    event_type: event.eventType,
    status_code: event.statusCode,
    amount: event.amount,
    currency: event.currency,
    verified: event.verified,
    payload: event.payload ?? {},
  });
  if (!error) return "inserted";
  if (error.code === "23505") return "duplicate";
  console.error("payment_events insert failed:", error);
  return "failed";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_Secret_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "server_misconfigured" });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  let cfg;
  try {
    cfg = getPayPlusConfig();
  } catch {
    return res.status(500).json({ error: "payplus_not_configured" });
  }

  const rawBody = await readRawBody(req);
  const hashHeader = (req.headers["hash"] as string | undefined) ?? undefined;
  const userAgent = String(req.headers["user-agent"] ?? "");

  if (!verifyCallbackSignature(rawBody, hashHeader, cfg.secretKey)) {
    // Forensics row, then reject. Key by body hash so repeated garbage dedupes.
    await recordEvent(supabase, {
      orderId: null,
      eventKey: `unverified:${sha256Hex(rawBody).slice(0, 40)}`,
      eventType: "unverified",
      statusCode: null,
      amount: null,
      currency: null,
      verified: false,
      payload: { user_agent: userAgent, body: rawBody.toString("utf8").slice(0, 4000) },
    });
    console.error("payplus-callback: invalid signature", { userAgent, hasHash: Boolean(hashHeader) });
    return res.status(401).json({ error: "invalid_signature" });
  }
  if (userAgent !== "PayPlus") {
    // Hash is the real authentication; log the anomaly but continue.
    console.warn("payplus-callback: unexpected user-agent", userAgent);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>;
  } catch {
    return res.status(400).json({ error: "invalid_json" });
  }

  const txn = extractCallbackTransaction(payload);
  const orderId = txn.moreInfo && UUID_RE.test(txn.moreInfo) ? txn.moreInfo : null;
  const eventKey = txn.transactionUid
    ? `${txn.transactionUid}:${txn.statusCode ?? "?"}:${txn.transactionType ?? "?"}`
    : `nokey:${sha256Hex(rawBody).slice(0, 40)}`;

  const inserted = await recordEvent(supabase, {
    orderId,
    eventKey,
    eventType: txn.transactionType,
    statusCode: txn.statusCode,
    amount: txn.amount,
    currency: txn.currency,
    verified: true,
    payload,
  });
  if (inserted === "duplicate") {
    return res.status(200).json({ ok: true, duplicate: true });
  }

  if (!orderId) {
    console.error("payplus-callback: no order id in more_info", txn);
    return res.status(200).json({ ok: true, ignored: "no_order_ref" });
  }

  // Refunds — and same-day voids ("Cancel", seen live 2026-09-01) — also hit
  // this endpoint; both un-pay the order from the store's perspective.
  if (txn.transactionType === "Refund" || txn.transactionType === "Cancel") {
    const { error } = await supabase
      .from("orders")
      .update({ financial_status: "refunded", refunded_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("financial_status", "paid");
    if (error) console.error("payplus-callback: refund update failed", orderId, error);
    return res.status(200).json({ ok: true, refund: true });
  }

  // Only an actual money-moving Charge may mark an order paid. The hosted page
  // also emits e.g. "Check" (J2 card validation) callbacks — seen live on
  // 2026-09-01 — which must never flip the order even with status_code 000.
  if (txn.transactionType !== "Charge") {
    return res.status(200).json({ ok: true, ignored: `type_${txn.transactionType ?? "unknown"}` });
  }

  // Declined attempt: record on the order, keep it pending so the customer can retry.
  if (txn.statusCode !== "000") {
    await supabase
      .from("orders")
      .update({ payment_status_raw: txn.statusCode })
      .eq("id", orderId)
      .eq("financial_status", "pending");
    return res.status(200).json({ ok: true, declined: txn.statusCode });
  }

  if (txn.amount === null) {
    console.error("payplus-callback: approved charge without amount", orderId, txn);
    return res.status(200).json({ ok: true, ignored: "no_amount" });
  }

  try {
    const result = await markOrderPaid(supabase, orderId, {
      provider: "payplus",
      transactionUid: txn.transactionUid,
      pageRequestUid: txn.pageRequestUid,
      amount: txn.amount,
      currency: txn.currency ?? "ILS",
      statusCode: txn.statusCode,
      method: txn.method,
      cardBrand: txn.cardBrand,
      cardLast4: txn.cardLast4,
      approvalNumber: txn.approvalNumber,
      raw: payload,
    });

    // Invoice+ document (issued with the charge) — store before the email so
    // the email can link it. Non-fatal if the columns aren't migrated yet.
    const invoice = extractCallbackInvoice(payload);
    if (invoice) {
      const { error: invoiceError } = await supabase
        .from("orders")
        .update({ invoice_number: invoice.number, invoice_url: invoice.url })
        .eq("id", orderId);
      if (invoiceError && invoiceError.code !== "PGRST204" && invoiceError.code !== "42703") {
        console.error("payplus-callback: invoice store failed", orderId, invoiceError);
      }
    }
    if (result.updated) {
      // Invoice+ "api" mode: issue the document now so the email can link it.
      await createAndStoreInvoice(supabase, orderId);
      await sendPaidOrderEmail(supabase, orderId, getPaymentBaseUrl(req));
    }
    return res.status(200).json({ ok: true, paid: true, firstTime: result.updated });
  } catch (error) {
    if (error instanceof PermanentPaymentError) {
      // A retry can never fix this (amount mismatch / bad state) — ack so
      // PayPlus stops retrying; the payment_events row keeps the evidence.
      console.error("payplus-callback: PERMANENT mismatch", orderId, error.message);
      return res.status(200).json({ ok: false, error: "mismatch_logged" });
    }
    // Transient (DB hiccup): drop the idempotency row so a provider retry can
    // re-process, and signal failure.
    await supabase.from("payment_events").delete().eq("provider", "payplus").eq("event_key", eventKey);
    console.error("payplus-callback: transient failure", orderId, error);
    return res.status(500).json({ error: "processing_failed" });
  }
}
