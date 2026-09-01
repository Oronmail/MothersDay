import type { VercelRequest } from "@vercel/node";
import { createHmac, createHash, timingSafeEqual } from "crypto";

/**
 * PayPlus REST client (docs.payplus.co.il).
 *
 * Env vars (server-side only, never VITE_):
 *   PAYPLUS_API_KEY           — from the PayPlus dashboard (per environment)
 *   PAYPLUS_SECRET_KEY        — signs requests and callback HMACs
 *   PAYPLUS_PAYMENT_PAGE_UID  — the hosted payment page to generate links for
 *   PAYPLUS_API_BASE          — optional; defaults to production
 *                               (staging: https://restapidev.payplus.co.il/api/v1.0)
 */

const DEFAULT_API_BASE = "https://restapi.payplus.co.il/api/v1.0";

export interface PayPlusConfig {
  apiKey: string;
  secretKey: string;
  paymentPageUid: string;
  apiBase: string;
}

export function getPayPlusConfig(): PayPlusConfig {
  const apiKey = process.env.PAYPLUS_API_KEY;
  const secretKey = process.env.PAYPLUS_SECRET_KEY;
  const paymentPageUid = process.env.PAYPLUS_PAYMENT_PAGE_UID;
  if (!apiKey || !secretKey || !paymentPageUid) {
    throw new Error("Missing PayPlus configuration (PAYPLUS_API_KEY / PAYPLUS_SECRET_KEY / PAYPLUS_PAYMENT_PAGE_UID)");
  }
  const apiBase = (process.env.PAYPLUS_API_BASE || DEFAULT_API_BASE).replace(/\/$/, "");
  return { apiKey, secretKey, paymentPageUid, apiBase };
}

export const isPayPlusConfigured = () =>
  Boolean(process.env.PAYPLUS_API_KEY && process.env.PAYPLUS_SECRET_KEY && process.env.PAYPLUS_PAYMENT_PAGE_UID);

/**
 * Invoice+ (חשבונית+): the business subscribed, so PayPlus issues the tax
 * invoice/receipt automatically per charge. Set PAYPLUS_INVOICE_ENABLED=false
 * to stop requesting documents without a code change.
 */
export const isInvoiceEnabled = () => process.env.PAYPLUS_INVOICE_ENABLED !== "false";

/**
 * Base URL for refURL_* and confirmation links.
 * In production the canonical VITE_SITE_URL is required — payment/email URLs
 * must never be derived from request headers there. On previews and local dev
 * the request host IS the right base (each preview has its own URL).
 */
export function getPaymentBaseUrl(req: VercelRequest): string {
  const envUrl = (process.env.VITE_SITE_URL || "").trim().replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "production") {
    if (!envUrl) throw new Error("VITE_SITE_URL must be set in production");
    return envUrl;
  }
  const forwardedHost = req.headers["x-forwarded-host"];
  const forwardedProto = req.headers["x-forwarded-proto"];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) || req.headers.host;
  const proto = (Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto) || "https";
  if (host) return `${proto}://${host}`.replace(/\/$/, "");
  return envUrl || "https://www.mothersday.co.il";
}

// ---------------------------------------------------------------------------
// generateLink
// ---------------------------------------------------------------------------

export interface GenerateLinkItem {
  name: string;
  quantity: number;
  price: number; // decimal ILS (not agorot)
  shipping?: boolean;
  vat_type?: number; // 0 = VAT included
}

export interface GenerateLinkParams {
  amount: number; // decimal ILS — must equal the sum of items
  currencyCode: string;
  orderId: string;
  orderNumber: number | string;
  customer: { name: string; email: string; phone?: string };
  items: GenerateLinkItem[];
  successUrl: string;
  failureUrl: string;
  cancelUrl: string;
  callbackUrl: string;
  /** Link validity in minutes (PayPlus default 30). */
  expiryMinutes?: number;
}

export interface GenerateLinkResult {
  pageRequestUid: string;
  paymentPageLink: string;
}

interface PayPlusEnvelope {
  results?: { status?: string; code?: number; description?: string };
  data?: Record<string, unknown>;
  message?: string;
}

async function payplusPost(cfg: PayPlusConfig, path: string, body: unknown): Promise<PayPlusEnvelope> {
  const response = await fetch(`${cfg.apiBase}${path}`, {
    method: "POST",
    headers: {
      "api-key": cfg.apiKey,
      "secret-key": cfg.secretKey,
      "Content-Type": "application/json",
    },
    // PayPlus expects UTF-8 JSON (raw Hebrew, not \u escapes) — JSON.stringify is fine.
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let parsed: PayPlusEnvelope;
  try {
    parsed = JSON.parse(text) as PayPlusEnvelope;
  } catch {
    throw new Error(`PayPlus ${path} returned non-JSON (HTTP ${response.status}): ${text.slice(0, 300)}`);
  }
  if (!response.ok && parsed.results?.status !== "success") {
    const desc = parsed.results?.description || parsed.message || `HTTP ${response.status}`;
    throw new Error(`PayPlus ${path} failed: ${desc}`);
  }
  return parsed;
}

export async function generatePaymentLink(
  cfg: PayPlusConfig,
  params: GenerateLinkParams
): Promise<GenerateLinkResult> {
  const body = {
    payment_page_uid: cfg.paymentPageUid,
    charge_method: 1, // J4 immediate charge
    amount: round2(params.amount),
    currency_code: params.currencyCode || "ILS",
    language_code: "he",
    expiry_datetime: String(params.expiryMinutes ?? 30),
    sendEmailApproval: false, // we send our own branded confirmation email
    sendEmailFailure: false,
    send_failure_callback: true,
    create_token: false,
    // Invoice+ — auto invoice/receipt per charge; prices are VAT-inclusive
    // (item vat_type 0), so the business is a VAT-registered dealer.
    ...(isInvoiceEnabled() ? { initial_invoice: true, paying_vat: true } : {}),
    refURL_success: params.successUrl,
    refURL_failure: params.failureUrl,
    refURL_cancel: params.cancelUrl,
    refURL_callback: params.callbackUrl,
    more_info: params.orderId,
    more_info_2: String(params.orderNumber),
    customer: {
      customer_name: params.customer.name || "לקוחת יום האם",
      email: params.customer.email,
      ...(params.customer.phone ? { phone: params.customer.phone } : {}),
    },
    items: params.items.map((item) => ({
      name: item.name.slice(0, 120),
      quantity: item.quantity,
      price: round2(item.price),
      vat_type: item.vat_type ?? 0,
      ...(item.shipping ? { shipping: true } : {}),
    })),
  };

  const parsed = await payplusPost(cfg, "/PaymentPages/generateLink", body);
  const data = parsed.data ?? {};
  const pageRequestUid = data["page_request_uid"] as string | undefined;
  const paymentPageLink = data["payment_page_link"] as string | undefined;
  if (parsed.results?.status !== "success" || !pageRequestUid || !paymentPageLink) {
    throw new Error(`PayPlus generateLink unexpected response: ${JSON.stringify(parsed).slice(0, 400)}`);
  }
  return { pageRequestUid, paymentPageLink };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Callback signature verification
// ---------------------------------------------------------------------------

/**
 * PayPlus signs every server-to-server callback:
 *   hash header === base64(HMAC-SHA256(secret_key, raw request body))
 * (docs: "Validate requests received from PayPlus"). Some SDKs emit hex — accept both.
 */
export function verifyCallbackSignature(rawBody: Buffer, hashHeader: string | undefined, secretKey: string): boolean {
  if (!hashHeader) return false;
  const hmac = createHmac("sha256", secretKey).update(rawBody);
  const digest = hmac.digest();
  const candidates = [digest.toString("base64"), digest.toString("hex")];
  const provided = Buffer.from(hashHeader.trim());
  return candidates.some((expected) => {
    const expectedBuf = Buffer.from(expected);
    return expectedBuf.length === provided.length && timingSafeEqual(expectedBuf, provided);
  });
}

export const sha256Hex = (data: Buffer | string) => createHash("sha256").update(data).digest("hex");

// ---------------------------------------------------------------------------
// IPN — authoritative transaction-status check by page_request_uid
// ---------------------------------------------------------------------------

export interface IpnStatus {
  found: boolean;
  approved: boolean;
  rejected: boolean;
  statusCode: string | null;
  transactionUid: string | null;
  amount: number | null;
  currency: string | null;
  moreInfo: string | null;
  method: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
  approvalNumber: string | null;
  raw: unknown;
}

/**
 * POST /PaymentPages/ipn — the response's `data` carries flat transaction fields
 * (same shape as the success redirect). Real-world responses vary slightly
 * (flat object / nested transaction / array), so extract defensively.
 */
export async function ipnCheck(cfg: PayPlusConfig, pageRequestUid: string): Promise<IpnStatus> {
  const parsed = await payplusPost(cfg, "/PaymentPages/ipn", {
    payment_request_uid: pageRequestUid,
    related_transaction: false,
  });

  const container = parsed.data;
  let t: Record<string, unknown> | null = null;
  if (Array.isArray(container)) {
    const first = container[0] as Record<string, unknown> | undefined;
    t = (first?.["transaction"] as Record<string, unknown>) ?? first ?? null;
  } else if (container && typeof container === "object") {
    t = (container["transaction"] as Record<string, unknown>) ?? container;
  }

  const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null);
  const num = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    return Number.isFinite(n) ? n : null;
  };

  const statusCode = t ? str(t["status_code"]) : null;
  const status = t ? str(t["status"]) : null;
  const found = Boolean(t && (statusCode || status));

  return {
    found,
    approved: statusCode === "000" || status === "approved",
    rejected: found && statusCode !== "000" && statusCode !== null,
    statusCode,
    transactionUid: t ? (str(t["transaction_uid"]) ?? str(t["uid"])) : null,
    amount: t ? num(t["amount"]) : null,
    currency: t ? (str(t["currency"]) ?? "ILS") : null,
    moreInfo: t ? str(t["more_info"]) : null,
    method: t ? str(t["method"]) : null,
    cardLast4: t ? (str(t["four_digits"]) ?? str(t["number"])) : null,
    cardBrand: t ? str(t["brand_name"]) : null,
    approvalNumber: t ? (str(t["approval_num"]) ?? str(t["approval_number"])) : null,
    raw: parsed,
  };
}

// ---------------------------------------------------------------------------
// Callback payload extraction
// ---------------------------------------------------------------------------

export interface CallbackTransaction {
  transactionType: string | null; // "Charge" | "Refund" | "Approval" | ...
  transactionUid: string | null;
  pageRequestUid: string | null;
  statusCode: string | null;
  amount: number | null;
  currency: string | null;
  moreInfo: string | null; // our orderId
  approvalNumber: string | null;
  method: string | null;
  cardLast4: string | null;
  cardBrand: string | null;
}

/** Invoice+ document details carried on the charge callback (when subscribed). */
export interface CallbackInvoice {
  number: string | null;
  url: string | null;
  status: string | null;
}

export function extractCallbackInvoice(payload: Record<string, unknown>): CallbackInvoice | null {
  const inv = payload["invoice"] as Record<string, unknown> | undefined;
  if (!inv || typeof inv !== "object") return null;
  const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null);
  const number = str(inv["docu_number"]);
  const url = str(inv["original_url"]) ?? str(inv["copy_url"]);
  if (!number && !url) return null;
  return { number, url, status: str(inv["status"]) };
}

export function extractCallbackTransaction(payload: Record<string, unknown>): CallbackTransaction {
  const t = (payload["transaction"] ?? {}) as Record<string, unknown>;
  const data = (payload["data"] ?? {}) as Record<string, unknown>;
  const card = (data["card_information"] ?? {}) as Record<string, unknown>;

  const str = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : null);
  const num = (v: unknown): number | null => {
    const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    return Number.isFinite(n) ? n : null;
  };

  return {
    transactionType: str(payload["transaction_type"]) ?? str(t["type"]),
    transactionUid: str(t["uid"]) ?? str(t["transaction_uid"]),
    // docs say payment_request_uid; the official plugins read payment_page_request_uid — accept both
    pageRequestUid: str(t["payment_request_uid"]) ?? str(t["payment_page_request_uid"]),
    statusCode: str(t["status_code"]),
    amount: num(t["amount"]),
    currency: str(t["currency"]) ?? "ILS",
    moreInfo: str(t["more_info"]),
    approvalNumber: str(t["approval_number"]) ?? str(t["approval_num"]),
    method: str(t["method"]) ?? (Object.keys(card).length > 0 ? "credit-card" : null),
    cardLast4: str(card["four_digits"]),
    cardBrand: str(card["brand_name"]),
  };
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
