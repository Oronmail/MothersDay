import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { sendOrderShippedEmail } from "./_lib/orderShippedEmail.js";

/**
 * Admin-only HFD shipping actions, one endpoint (keeps the Vercel function count low):
 *
 *   POST   /api/hfd-shipment  { orderId }   — create the shipment at HFD
 *   GET    /api/hfd-shipment?orderId=…      — stream the label PDF
 *   DELETE /api/hfd-shipment  { orderId }   — cancel the shipment at HFD
 *
 * HFD has no published API docs; this contract was extracted from their official
 * WordPress plugin (hfd-epost-integration v2.21). All calls authenticate with a
 * long-lived JWT the customer portal issues (כניסה ללקוחות → הנפקת טוקן).
 *
 * Env vars (server-side only, never VITE_):
 *   HFD_API_TOKEN      — bearer token from the HFD customer portal (has an expiry date!)
 *   HFD_CLIENT_NUMBER  — the HFD subscription number (מספר מנוי)
 *   HFD_API_BASE       — optional; defaults to https://api.hfd.co.il/rest/v2
 *   HFD_SENDER_NAME    — optional; defaults to "יום האם"
 *
 * Security properties:
 *  - every method requires a Supabase JWT whose profile role is 'admin'
 *  - the recipient/address always comes from the ORDER ROW, never from the client
 *  - hfd_* columns are written here with the service role only
 */

const DEFAULT_API_BASE = "https://api.hfd.co.il/rest/v2";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HFD_TIMEOUT_MS = 15_000;

// Fixed shipment profile: regular door-to-door delivery (no pickup points, no COD).
// Codes from the WordPress plugin: shipmentTypeCode 35 = home delivery,
// cargoTypeHaloch 10 = regular parcel.
const SHIPMENT_TYPE_HOME_DELIVERY = 35;
const CARGO_TYPE_REGULAR = 10;

interface HfdConfig {
  token: string;
  clientNumber: number;
  apiBase: string;
  senderName: string;
}

function getHfdConfig(): HfdConfig | null {
  const token = process.env.HFD_API_TOKEN;
  const clientNumber = Number(process.env.HFD_CLIENT_NUMBER);
  if (!token || !Number.isInteger(clientNumber) || clientNumber <= 0) return null;
  return {
    token,
    clientNumber,
    apiBase: (process.env.HFD_API_BASE || DEFAULT_API_BASE).replace(/\/$/, ""),
    senderName: process.env.HFD_SENDER_NAME || "יום האם",
  };
}

/** The subset of the orders row this endpoint reads (fetched with select("*")). */
interface OrderRow {
  id: string;
  order_number?: number | null;
  user_id?: string | null;
  guest_email?: string | null;
  customer_email?: string | null;
  financial_status?: string | null;
  notes?: string | null;
  shipping_address?: {
    full_name?: string;
    city?: string;
    street?: string;
    house_number?: string;
    apartment?: string;
    phone?: string;
  } | null;
  hfd_shipment_number?: string | null;
  hfd_shipment_cancelled_at?: string | null;
}

const hfdHeaders = (config: HfdConfig, accept = "application/json") => ({
  Authorization: `Bearer ${config.token}`,
  "Content-Type": "application/json",
  Accept: accept,
});

/** HFD wants a local Israeli number; orders store one already, but normalize defensively. */
function toLocalPhone(phone: string | null | undefined): string {
  if (!phone) return "";
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+972")) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith("972")) digits = `0${digits.slice(3)}`;
  return digits;
}

/**
 * Resolves the caller to an admin user, or sends the error response and returns null.
 * Admin here means profiles.role === 'admin' — the same check the admin UI gates on.
 */
async function requireAdmin(
  req: VercelRequest,
  res: VercelResponse,
  supabase: SupabaseClient,
): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "unauthorized" });
    return null;
  }
  const { data: authData } = await supabase.auth.getUser(authHeader.slice(7));
  const userId = authData?.user?.id;
  if (!userId) {
    res.status(401).json({ error: "unauthorized" });
    return null;
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  if (profile?.role !== "admin") {
    res.status(403).json({ error: "forbidden" });
    return null;
  }
  return userId;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST" && req.method !== "GET" && req.method !== "DELETE") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_Secret_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: "server_misconfigured" });
  }
  const config = getHfdConfig();
  if (!config) {
    return res.status(503).json({
      error: "hfd_not_configured",
      message: "חסרים HFD_API_TOKEN / HFD_CLIENT_NUMBER בהגדרות השרת.",
    });
  }
  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  if (!(await requireAdmin(req, res, supabase))) return;

  const orderId =
    req.method === "GET" ? String(req.query.orderId ?? "") : String((req.body ?? {}).orderId ?? "");
  if (!UUID_RE.test(orderId)) {
    return res.status(400).json({ error: "invalid_request" });
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (orderError || !order) {
    return res.status(404).json({ error: "order_not_found" });
  }

  try {
    if (req.method === "POST") return await createShipment(res, supabase, config, order);
    if (req.method === "GET") return await streamLabel(res, config, order);
    return await cancelShipment(res, supabase, config, order);
  } catch (error) {
    console.error(`hfd-shipment ${req.method} failed:`, orderId, error);
    return res.status(502).json({
      error: "hfd_error",
      message: "התקשורת עם HFD נכשלה. נסי שוב בעוד רגע.",
    });
  }
}

// ---------------------------------------------------------------------------
// POST — create
// ---------------------------------------------------------------------------

async function createShipment(
  res: VercelResponse,
  supabase: SupabaseClient,
  config: HfdConfig,
  order: OrderRow,
) {
  if (order.hfd_shipment_number && !order.hfd_shipment_cancelled_at) {
    return res.status(409).json({
      error: "shipment_exists",
      message: `כבר קיים משלוח פעיל להזמנה הזו (מס' ${order.hfd_shipment_number}).`,
    });
  }
  if (order.financial_status !== "paid") {
    return res.status(409).json({
      error: "order_not_paid",
      message: "ההזמנה עדיין לא שולמה. אפשר לשדר משלוח רק להזמנה ששולמה.",
    });
  }

  const address = (order.shipping_address ?? {}) as {
    full_name?: string;
    city?: string;
    street?: string;
    house_number?: string;
    apartment?: string;
    phone?: string;
  };
  if (!address.city || !address.street || !address.full_name) {
    return res.status(409).json({
      error: "address_incomplete",
      message: "חסרים פרטי כתובת (שם / עיר / רחוב) בהזמנה.",
    });
  }

  let customerEmail: string | null = order.customer_email || order.guest_email;
  if (!customerEmail && order.user_id) {
    const { data: authUser } = await supabase.auth.admin.getUserById(order.user_id);
    customerEmail = authUser?.user?.email ?? null;
  }

  const payload = {
    clientNumber: config.clientNumber,
    mesiraIsuf: "מסירה",
    shipmentTypeCode: SHIPMENT_TYPE_HOME_DELIVERY,
    cargoTypeHaloch: CARGO_TYPE_REGULAR,
    cargoTypeHazor: 0,
    packsHaloch: "1",
    stageCode: null,
    pudoCodeDestination: 0,
    productsPrice: 0,
    ordererName: config.senderName,
    nameTo: address.full_name,
    cityName: address.city,
    streetName: address.street,
    streetCode: "",
    houseNum: address.house_number || "",
    apartment: address.apartment || "",
    floor: "",
    entrance: "",
    telFirst: toLocalPhone(address.phone),
    email: customerEmail || "",
    referenceNum1: String(order.order_number ?? ""),
    addressRemarks: "",
    shipmentRemarks: order.notes || "",
  };

  const response = await fetch(`${config.apiBase}/shipments/create`, {
    method: "POST",
    headers: hfdHeaders(config),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(HFD_TIMEOUT_MS),
  });
  const body = await response.json().catch(() => null);

  if (!body?.shipmentNumber) {
    const message = body?.errorMessage || body?.details;
    console.error("hfd-shipment create rejected:", order.id, response.status, body);
    return res.status(502).json({
      error: "hfd_rejected",
      message: typeof message === "string" && message
        ? `HFD דחתה את המשלוח: ${message}`
        : "HFD דחתה את המשלוח. בדקי את פרטי הכתובת ונסי שוב.",
    });
  }

  const shipmentNumber = String(body.shipmentNumber);
  const randNumber = body.randNumber != null ? String(body.randNumber) : null;

  const { error: updateError } = await supabase
    .from("orders")
    .update({
      hfd_shipment_number: shipmentNumber,
      hfd_rand_number: randNumber,
      hfd_shipment_created_at: new Date().toISOString(),
      hfd_shipment_cancelled_at: null,
      tracking_number: shipmentNumber,
    })
    .eq("id", order.id);
  if (updateError) {
    // The shipment DOES exist at HFD now — surface the number so it isn't lost.
    console.error("hfd-shipment: created at HFD but failed to store", order.id, shipmentNumber, updateError);
    return res.status(500).json({
      error: "store_failed",
      message: `המשלוח נוצר ב-HFD (מס' ${shipmentNumber}) אבל השמירה בהזמנה נכשלה. רעננו את העמוד.`,
    });
  }

  // "ההזמנה בדרך" email with the tracking link — for guests this is the only
  // way tracking reaches them. Never fails the shipment creation.
  const trackingUrl = randNumber ? `https://run.hfd.co.il/info/${randNumber}` : null;
  let shippedEmailSent = false;
  if (customerEmail) {
    const emailResult = await sendOrderShippedEmail({
      to: customerEmail,
      orderNumber: order.order_number ?? 0,
      shipmentNumber,
      trackingUrl,
      shippingAddress: {
        full_name: address.full_name,
        street: [address.street, address.house_number].filter(Boolean).join(" "),
        city: address.city,
      },
    });
    shippedEmailSent = emailResult.sent;
    if (emailResult.sent) {
      await supabase
        .from("orders")
        .update({ shipped_email_sent_at: new Date().toISOString() })
        .eq("id", order.id);
    }
  }

  return res.status(200).json({
    shipmentNumber,
    randNumber,
    trackingUrl,
    shippedEmailSent,
  });
}

// ---------------------------------------------------------------------------
// GET — label PDF
// ---------------------------------------------------------------------------

async function streamLabel(res: VercelResponse, config: HfdConfig, order: OrderRow) {
  const shipmentNumber = order.hfd_shipment_number;
  if (!shipmentNumber) {
    return res.status(404).json({ error: "no_shipment" });
  }

  const response = await fetch(`${config.apiBase}/shipments/${encodeURIComponent(shipmentNumber)}/label`, {
    headers: hfdHeaders(config, "application/pdf"),
    signal: AbortSignal.timeout(HFD_TIMEOUT_MS),
  });

  // The label arrives either as a raw PDF or as JSON { Base64String } — accept both.
  let pdf: Buffer;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const body = await response.json().catch(() => null);
    pdf = body?.Base64String ? Buffer.from(body.Base64String, "base64") : Buffer.alloc(0);
  } else {
    pdf = Buffer.from(await response.arrayBuffer());
  }

  if (!response.ok || pdf.subarray(0, 4).toString() !== "%PDF") {
    console.error("hfd-shipment label failed:", order.id, shipmentNumber, response.status);
    return res.status(502).json({
      error: "label_failed",
      message: "הדפסת התווית נכשלה. נסי שוב בעוד רגע.",
    });
  }

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="hfd-${shipmentNumber}.pdf"`);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).send(pdf);
}

// ---------------------------------------------------------------------------
// DELETE — cancel
// ---------------------------------------------------------------------------

async function cancelShipment(
  res: VercelResponse,
  supabase: SupabaseClient,
  config: HfdConfig,
  order: OrderRow,
) {
  const shipmentNumber = order.hfd_shipment_number;
  if (!shipmentNumber || order.hfd_shipment_cancelled_at) {
    return res.status(409).json({ error: "no_active_shipment", message: "אין משלוח פעיל לביטול." });
  }

  const response = await fetch(`${config.apiBase}/shipments/${encodeURIComponent(shipmentNumber)}`, {
    method: "DELETE",
    headers: hfdHeaders(config),
    signal: AbortSignal.timeout(HFD_TIMEOUT_MS),
  });
  const body = await response.json().catch(() => null);

  if (!response.ok || body?.errorMessage) {
    console.error("hfd-shipment cancel failed:", order.id, shipmentNumber, response.status, body);
    return res.status(502).json({
      error: "cancel_failed",
      message: body?.errorMessage
        ? `HFD לא ביטלה את המשלוח: ${body.errorMessage}`
        : "ביטול המשלוח נכשל. אפשר לנסות שוב או לפנות לשירות הלקוחות של HFD.",
    });
  }

  // Keep the shipment number for the audit trail; only mark it cancelled.
  const { error: updateError } = await supabase
    .from("orders")
    .update({
      hfd_shipment_cancelled_at: new Date().toISOString(),
      tracking_number: null,
    })
    .eq("id", order.id);
  if (updateError) {
    console.error("hfd-shipment: cancelled at HFD but failed to store", order.id, updateError);
    return res.status(500).json({
      error: "store_failed",
      message: "המשלוח בוטל ב-HFD אבל השמירה בהזמנה נכשלה. רעננו את העמוד.",
    });
  }

  return res.status(200).json({ cancelled: true });
}
