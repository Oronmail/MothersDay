import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { createOrderAccessToken, getOrderAccessSecret } from "./_lib/orderAccess";

/**
 * Vercel API route: GET /api/payment-callback
 *
 * Hyp redirects here after payment. Validates the response MAC,
 * updates the order status in Supabase, and redirects the browser
 * to the checkout confirmation or error page.
 *
 * Required env vars:
 *   HYP_PASSWORD        — used for MAC validation
 *   SUPABASE_Secret_KEY — Supabase service role key (server-side only)
 *   VITE_SUPABASE_URL   — Supabase project URL
 *   SITE_URL            — e.g. "https://mothers-day-flax-one.vercel.app"
 */

function validateResponseMac(params: Record<string, string>, password: string): boolean {
  const { txId, uniqueID, cardToken, cardExp, personalId, responseMac } = params;
  // Hyp MAC = SHA-256(password + txId + "000" + cardToken + cardExp + personalId + uniqueID)
  const payload = `${password}${txId || ""}000${cardToken || ""}${cardExp || ""}${personalId || ""}${uniqueID || ""}`;
  const expected = createHash("sha256").update(payload).digest("hex");
  return expected === responseMac;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    status,
    orderId,
    uniqueID,
    cgUid,
    authNumber,
    responseMac,
    cardToken,
    cardExp,
    cardMask,
    txId,
    personalId,
  } = req.query as Record<string, string>;

  const {
    HYP_PASSWORD,
    VITE_SUPABASE_URL,
    SUPABASE_Secret_KEY,
    SITE_URL,
  } = process.env;

  if (!VITE_SUPABASE_URL || !SUPABASE_Secret_KEY || !SITE_URL) {
    return res.redirect(302, `${SITE_URL || ""}/checkout?error=config`);
  }

  const effectiveOrderId = orderId || uniqueID;

  if (status === "success" && effectiveOrderId) {
    // Validate MAC if password is available
    if (HYP_PASSWORD && responseMac) {
      const isValid = validateResponseMac(
        { txId, uniqueID: uniqueID || orderId, cardToken, cardExp, personalId, responseMac },
        HYP_PASSWORD
      );
      if (!isValid) {
        console.error("Invalid responseMac for order:", effectiveOrderId);
        return res.redirect(302, `${SITE_URL}/checkout?error=validation`);
      }
    }

    // Update order status to paid
    const supabase = createClient(VITE_SUPABASE_URL, SUPABASE_Secret_KEY);

    const { data: orderRow, error } = await supabase
      .from("orders")
      .update({
        financial_status: "paid",
        notes: JSON.stringify({
          hyp_cguid: cgUid,
          hyp_auth: authNumber,
          hyp_card_mask: cardMask,
          hyp_txid: txId,
        }),
      })
      .select("guest_email, user_id")
      .eq("id", effectiveOrderId);

    if (error) {
      console.error("Failed to update order:", error);
    }

    const ownerRef = orderRow?.[0]?.user_id || orderRow?.[0]?.guest_email;
    const token = ownerRef
      ? createOrderAccessToken(effectiveOrderId, ownerRef, getOrderAccessSecret())
      : null;
    const confirmationUrl = token
      ? `${SITE_URL}/checkout/confirmation/${effectiveOrderId}?token=${encodeURIComponent(token)}`
      : `${SITE_URL}/checkout/confirmation/${effectiveOrderId}`;

    return res.redirect(302, confirmationUrl);
  }

  if (status === "cancel") {
    return res.redirect(302, `${SITE_URL}/checkout?cancelled=true`);
  }

  // Error or unknown status
  return res.redirect(302, `${SITE_URL}/checkout?error=payment`);
}
