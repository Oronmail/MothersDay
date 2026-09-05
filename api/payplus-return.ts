import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { createOrderAccessToken, getOrderAccessSecret } from "./_lib/orderAccess.js";
import { getPayPlusConfig, getPaymentBaseUrl, ipnCheck, UUID_RE } from "./_lib/payplus.js";
import { createAndStoreInvoice, markOrderPaid, notifyOwnersOfPaidOrder, PermanentPaymentError, sendPaidOrderEmail } from "./_lib/orderPayment.js";

/**
 * GET|POST /api/payplus-return?orderId=…[&fail=1|&cancel=1]
 *
 * The customer lands here from the PayPlus hosted page (refURL_success /
 * refURL_failure / refURL_cancel — GET or POST depending on the payment-page
 * dashboard setting; our own query params are preserved either way).
 *
 * The redirect parameters PayPlus appends are UNSIGNED and are never trusted.
 * Payment state is confirmed via the stored page_request_uid against the
 * authoritative /PaymentPages/ipn endpoint; the server callback usually got
 * there first anyway.
 */

const IPN_ATTEMPTS = 3;
const IPN_DELAY_MS = 1200;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const base = getPaymentBaseUrl(req);
  const orderId = String(req.query.orderId ?? "");
  const isCancel = req.query.cancel === "1";
  const isFail = req.query.fail === "1";

  if (!UUID_RE.test(orderId)) {
    return res.redirect(302, `${base}/checkout?payment=error`);
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_Secret_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.redirect(302, `${base}/checkout?payment=error`);
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    // select("*"): keeps working before the payments migration is applied.
    const { data: order } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (!order) {
      return res.redirect(302, `${base}/checkout?payment=error`);
    }

    const ownerRef = order.user_id || order.guest_email || order.customer_email;
    const token = ownerRef ? createOrderAccessToken(order.id, ownerRef, getOrderAccessSecret()) : null;
    const confirmationUrl = token
      ? `${base}/checkout/confirmation/${order.id}?token=${encodeURIComponent(token)}`
      : `${base}/checkout/confirmation/${order.id}`;

    // Callback already settled it.
    if (order.financial_status === "paid") {
      return res.redirect(302, confirmationUrl);
    }

    if (isCancel) {
      return res.redirect(302, `${base}/checkout?payment=cancelled&orderId=${orderId}`);
    }

    // Confirm authoritatively with PayPlus using our stored page_request_uid.
    if (order.payment_page_request_uid) {
      const cfg = getPayPlusConfig();
      for (let attempt = 0; attempt < IPN_ATTEMPTS; attempt++) {
        try {
          const status = await ipnCheck(cfg, order.payment_page_request_uid);

          if (status.approved && status.amount !== null) {
            const result = await markOrderPaid(supabase, orderId, {
              provider: "payplus",
              transactionUid: status.transactionUid,
              pageRequestUid: order.payment_page_request_uid,
              amount: status.amount,
              currency: status.currency ?? "ILS",
              statusCode: status.statusCode,
              method: status.method,
              cardBrand: status.cardBrand,
              cardLast4: status.cardLast4,
              approvalNumber: status.approvalNumber,
              raw: status.raw,
            });
            if (result.updated) {
              await createAndStoreInvoice(supabase, orderId);
              await sendPaidOrderEmail(supabase, orderId, base);
              await notifyOwnersOfPaidOrder(supabase, orderId, base);
            }
            return res.redirect(302, confirmationUrl);
          }

          if (status.rejected) {
            await supabase
              .from("orders")
              .update({ payment_status_raw: status.statusCode })
              .eq("id", orderId)
              .eq("financial_status", "pending");
            return res.redirect(302, `${base}/checkout?payment=failed&orderId=${orderId}`);
          }
        } catch (error) {
          if (error instanceof PermanentPaymentError) {
            console.error("payplus-return: permanent mismatch", orderId, error.message);
            return res.redirect(302, `${base}/checkout?payment=error`);
          }
          console.error(`payplus-return: ipn attempt ${attempt + 1} failed`, orderId, error);
        }
        if (attempt < IPN_ATTEMPTS - 1) await sleep(IPN_DELAY_MS);
      }
    }

    // Inconclusive. On an explicit failure return, send them back to retry;
    // otherwise let the confirmation page show "verifying" and poll — the
    // server callback normally lands within seconds.
    if (isFail) {
      return res.redirect(302, `${base}/checkout?payment=failed&orderId=${orderId}`);
    }
    return res.redirect(302, confirmationUrl);
  } catch (error) {
    console.error("payplus-return failed:", orderId, error);
    return res.redirect(302, `${base}/checkout?payment=error`);
  }
}
