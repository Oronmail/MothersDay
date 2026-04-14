import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { createOrderAccessToken, getOrderAccessSecret } from "./_lib/orderAccess.js";
import { isPaymentSimulationEnabled } from "./_lib/checkout.js";
import { getRequestSiteUrl } from "./_lib/siteUrl.js";
import { sendOrderConfirmationEmail } from "./_lib/orderConfirmationEmail.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!isPaymentSimulationEnabled()) {
    return res.status(403).json({ error: "Payment simulation is disabled" });
  }

  const { orderId } = req.body as { orderId?: string };
  if (!orderId) {
    return res.status(400).json({ error: "orderId is required" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_Secret_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "Missing Supabase configuration" });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const siteUrl = getRequestSiteUrl(req);

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select(
      "id, order_number, user_id, guest_email, line_items, shipping_address, total_price, shipping_cost, currency_code, financial_status"
    )
    .eq("id", orderId)
    .single();

  if (orderError || !order) {
    return res.status(404).json({ error: "Order not found" });
  }

  if (order.financial_status !== "paid") {
    const { error: updateError } = await supabase
      .from("orders")
      .update({ financial_status: "paid" })
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to mark simulated order as paid:", updateError);
      return res.status(500).json({ error: "Failed to update order status" });
    }
  }

  let customerEmail = order.guest_email as string | null;

  if (!customerEmail && order.user_id) {
    const { data: authUserResult, error: authUserError } =
      await supabase.auth.admin.getUserById(order.user_id);

    if (!authUserError) {
      customerEmail = authUserResult.user?.email ?? null;
    }
  }

  const ownerRef = order.user_id || customerEmail;
  const token = ownerRef
    ? createOrderAccessToken(orderId, ownerRef, getOrderAccessSecret())
    : null;
  const confirmationUrl = token
    ? `${siteUrl}/checkout/confirmation/${orderId}?token=${encodeURIComponent(token)}`
    : `${siteUrl}/checkout/confirmation/${orderId}`;

  const emailResult = customerEmail
    ? await sendOrderConfirmationEmail({
        to: customerEmail,
        orderNumber: order.order_number,
        lineItems: order.line_items,
        totalPrice: order.total_price,
        shippingCost: order.shipping_cost || 0,
        currencyCode: order.currency_code || "ILS",
        shippingAddress: order.shipping_address,
        confirmationUrl,
        siteUrl,
        simulated: true,
      })
    : { sent: false as const, reason: "missing_customer_email" };

  return res.status(200).json({
    confirmationUrl,
    emailSent: emailResult.sent,
    emailError: emailResult.sent ? null : emailResult.reason,
  });
}
