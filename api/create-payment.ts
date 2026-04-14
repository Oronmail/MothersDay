import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isCheckoutEnabled } from "./_lib/checkout";

/**
 * Vercel API route: POST /api/create-payment
 *
 * Creates a Hyp (CreditGuard) payment session and returns the hosted payment page URL
 * to be loaded in an iframe on the checkout page.
 *
 * Required env vars:
 *   HYP_SERVER_URL    — e.g. "https://cguat2.creditguard.co.il" (sandbox) or production URL
 *   HYP_USER          — merchant username from Hyp
 *   HYP_PASSWORD      — merchant password from Hyp
 *   HYP_TERMINAL      — terminal number
 *   HYP_MID           — merchant ID
 *   SITE_URL          — e.g. "https://mothers-day-flax-one.vercel.app"
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isCheckoutEnabled()) {
    return res.status(503).json({ error: "Checkout is currently disabled" });
  }

  const { orderId, totalPrice, currency = "ILS" } = req.body as {
    orderId: string;
    totalPrice: number;
    currency?: string;
  };

  if (!orderId || !totalPrice) {
    return res.status(400).json({ error: "orderId and totalPrice are required" });
  }

  const {
    HYP_SERVER_URL,
    HYP_USER,
    HYP_PASSWORD,
    HYP_TERMINAL,
    HYP_MID,
    SITE_URL,
  } = process.env;

  if (!HYP_SERVER_URL || !HYP_USER || !HYP_PASSWORD || !HYP_TERMINAL || !HYP_MID || !SITE_URL) {
    return res.status(500).json({ error: "Missing Hyp payment configuration" });
  }

  // Hyp expects amount in subunits (agorot for ILS): 150.00 ILS = 15000
  const totalInSubunits = Math.round(totalPrice * 100);

  const successUrl = `${SITE_URL}/api/payment-callback?status=success&orderId=${orderId}`;
  const errorUrl = `${SITE_URL}/api/payment-callback?status=error&orderId=${orderId}`;
  const cancelUrl = `${SITE_URL}/api/payment-callback?status=cancel&orderId=${orderId}`;

  // ppsJSONConfig allows iframe embedding from our domain
  const ppsConfig = JSON.stringify({
    frameAncestorURLs: SITE_URL,
  });

  const xmlPayload = `<?xml version="1.0" encoding="UTF-8"?>
<ashrait>
  <request>
    <version>2000</version>
    <language>HEB</language>
    <command>doDeal</command>
    <doDeal>
      <terminalNumber>${HYP_TERMINAL}</terminalNumber>
      <cardNo>CGMPI</cardNo>
      <total>${totalInSubunits}</total>
      <transactionType>Debit</transactionType>
      <creditType>RegularCredit</creditType>
      <currency>${currency}</currency>
      <transactionCode>Internet</transactionCode>
      <validation>TxnSetup</validation>
      <mid>${HYP_MID}</mid>
      <uniqueid>${orderId}</uniqueid>
      <mpiValidation>AutoComm</mpiValidation>
      <successUrl>${successUrl}</successUrl>
      <errorUrl>${errorUrl}</errorUrl>
      <cancelUrl>${cancelUrl}</cancelUrl>
      <paymentPageData>
        <ppsJSONConfig>${ppsConfig}</ppsJSONConfig>
      </paymentPageData>
    </doDeal>
  </request>
</ashrait>`;

  try {
    const response = await fetch(`${HYP_SERVER_URL}/xpo/Relay`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        user: HYP_USER,
        password: HYP_PASSWORD,
        int_in: xmlPayload,
      }),
    });

    const xmlResponse = await response.text();

    // Extract mpiHostedPageUrl from XML response
    const urlMatch = xmlResponse.match(/<mpiHostedPageUrl>(.*?)<\/mpiHostedPageUrl>/);
    const resultMatch = xmlResponse.match(/<result>(.*?)<\/result>/);
    const messageMatch = xmlResponse.match(/<message>(.*?)<\/message>/);

    const result = resultMatch?.[1];
    if (result !== "000" || !urlMatch?.[1]) {
      console.error("Hyp payment session failed:", xmlResponse);
      return res.status(502).json({
        error: "Payment session creation failed",
        message: messageMatch?.[1] || "Unknown error from payment provider",
      });
    }

    return res.status(200).json({
      paymentPageUrl: urlMatch[1],
    });
  } catch (error) {
    console.error("Hyp API error:", error);
    return res.status(502).json({ error: "Failed to connect to payment provider" });
  }
}
