import type { LowStockItem } from "./inventory.js";

/**
 * "הזמנה חדשה" email to the store owners (decision 7): one per paid order, to
 * ORDER_ALERT_EMAILS. Plain and dense — this is an operations email, not the
 * customer's branded one. When the order pushed items under their threshold,
 * the same email carries a מלאי נמוך section so the owners get one email, not two.
 */

export interface AdminOrderEmailItem {
  title: string;
  quantity: number;
  price: number;
  /** Kit parts, for the packer's eyes. */
  parts?: Array<{ title: string; quantity: number }>;
}

export interface AdminOrderEmailPayload {
  to: string[];
  orderNumber: number;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  city: string | null;
  items: AdminOrderEmailItem[];
  subtotal: number | null;
  discountCode: string | null;
  discountAmount: number;
  shippingCost: number;
  total: number;
  paymentMethod: string | null;
  cardLast4: string | null;
  adminUrl: string;
  lowStock: LowStockItem[];
  simulated: boolean;
}

const DEFAULT_FROM = "יום האם <orders@noreply.mothersday.co.il>";

const shekel = (n: number) => `₪${Number.isInteger(n) ? n : n.toFixed(2)}`;

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const buildAdminOrderSubject = (p: AdminOrderEmailPayload) =>
  `${p.simulated ? "[בדיקה] " : ""}הזמנה חדשה #${p.orderNumber} · ${p.customerName || p.customerEmail || "לקוחה"} · ${shekel(p.total)}`;

const lowStockLine = (i: LowStockItem) =>
  `${i.title}${i.sku ? ` (${i.sku})` : ""}: ${i.available === 1 ? "נשארה יחידה אחת" : `נשארו ${i.available}`} (סף ${i.threshold})` +
  (i.blockedKits.length ? ` — חוסם: ${i.blockedKits.join(", ")}` : "");

export const buildAdminOrderText = (p: AdminOrderEmailPayload): string => {
  const lines: string[] = [];
  lines.push(`הזמנה חדשה #${p.orderNumber}${p.simulated ? " (בדיקה)" : ""}`);
  lines.push("");
  lines.push(`לקוחה: ${p.customerName || "—"}`);
  if (p.customerEmail) lines.push(`אימייל: ${p.customerEmail}`);
  if (p.customerPhone) lines.push(`טלפון: ${p.customerPhone}`);
  if (p.city) lines.push(`עיר: ${p.city}`);
  lines.push("");
  lines.push("פריטים:");
  for (const item of p.items) {
    lines.push(`${item.quantity} × ${item.title} — ${shekel(item.price * item.quantity)}`);
    for (const part of item.parts ?? []) lines.push(`  └ ${part.quantity * item.quantity} × ${part.title}`);
  }
  lines.push("");
  if (p.subtotal !== null) lines.push(`סכום ביניים: ${shekel(p.subtotal)}`);
  if (p.discountAmount > 0) lines.push(`הנחה${p.discountCode ? ` (${p.discountCode})` : ""}: -${shekel(p.discountAmount)}`);
  lines.push(`משלוח: ${p.shippingCost > 0 ? shekel(p.shippingCost) : "חינם"}`);
  lines.push(`סה"כ: ${shekel(p.total)}`);
  if (p.paymentMethod || p.cardLast4) {
    lines.push(`תשלום: ${[p.paymentMethod, p.cardLast4 ? `•••• ${p.cardLast4}` : null].filter(Boolean).join(" ")}`);
  }
  if (p.lowStock.length) {
    lines.push("");
    lines.push("⚠ מלאי נמוך אחרי ההזמנה הזו:");
    for (const i of p.lowStock) lines.push(`- ${lowStockLine(i)}`);
  }
  lines.push("");
  lines.push(`לכרטיס ההזמנה: ${p.adminUrl}`);
  return lines.join("\n");
};

export const buildAdminOrderHtml = (p: AdminOrderEmailPayload): string => {
  const row = (label: string, value: string) =>
    `<tr><td style="padding:4px 8px;color:#8a7e74;white-space:nowrap">${label}</td><td style="padding:4px 8px">${value}</td></tr>`;
  const itemsHtml = p.items
    .map((item) => {
      const parts = (item.parts ?? [])
        .map((part) => `<div style="color:#8a7e74;font-size:13px;padding-right:14px">└ ${part.quantity * item.quantity} × ${escapeHtml(part.title)}</div>`)
        .join("");
      return `<tr><td style="padding:6px 8px;border-bottom:1px solid #ded8d1">${item.quantity} × ${escapeHtml(item.title)}${parts}</td><td style="padding:6px 8px;border-bottom:1px solid #ded8d1;white-space:nowrap">${shekel(item.price * item.quantity)}</td></tr>`;
    })
    .join("");
  const lowStockHtml = p.lowStock.length
    ? `<div style="margin:18px 0;padding:12px 14px;background:#f4dddb;border:1px solid #b23a3a;color:#4d3c40">
         <strong>⚠ מלאי נמוך אחרי ההזמנה הזו</strong>
         <ul style="margin:8px 0 0;padding-right:18px">${p.lowStock.map((i) => `<li>${escapeHtml(lowStockLine(i))}</li>`).join("")}</ul>
       </div>`
    : "";
  return `<!DOCTYPE html><html dir="rtl" lang="he"><body style="margin:0;padding:24px;background:#ece7e1;font-family:Assistant,Arial,sans-serif;color:#4d3c40">
  <div style="max-width:560px;margin:0 auto;background:#f8f6f2;border:1px solid #ded8d1;padding:20px 22px">
    <h1 style="font-size:20px;margin:0 0 14px">הזמנה חדשה #${p.orderNumber}${p.simulated ? " <span style=\"color:#b7791f\">(בדיקה)</span>" : ""}</h1>
    <table style="border-collapse:collapse;font-size:14px;margin-bottom:14px">
      ${row("לקוחה", escapeHtml(p.customerName || "—"))}
      ${p.customerEmail ? row("אימייל", `<a href="mailto:${escapeHtml(p.customerEmail)}">${escapeHtml(p.customerEmail)}</a>`) : ""}
      ${p.customerPhone ? row("טלפון", `<span dir="ltr">${escapeHtml(p.customerPhone)}</span>`) : ""}
      ${p.city ? row("עיר", escapeHtml(p.city)) : ""}
    </table>
    <table style="border-collapse:collapse;width:100%;font-size:14px">${itemsHtml}</table>
    <table style="border-collapse:collapse;font-size:14px;margin-top:10px">
      ${p.subtotal !== null ? row("סכום ביניים", shekel(p.subtotal)) : ""}
      ${p.discountAmount > 0 ? row(`הנחה${p.discountCode ? ` (${escapeHtml(p.discountCode)})` : ""}`, `-${shekel(p.discountAmount)}`) : ""}
      ${row("משלוח", p.shippingCost > 0 ? shekel(p.shippingCost) : "חינם")}
      ${row("<strong>סה\"כ</strong>", `<strong>${shekel(p.total)}</strong>`)}
      ${p.paymentMethod || p.cardLast4 ? row("תשלום", escapeHtml([p.paymentMethod, p.cardLast4 ? `•••• ${p.cardLast4}` : null].filter(Boolean).join(" "))) : ""}
    </table>
    ${lowStockHtml}
    <p style="margin:18px 0 0"><a href="${escapeHtml(p.adminUrl)}" style="display:inline-block;padding:10px 16px;background:#4d3c40;color:#fff;text-decoration:none">לכרטיס ההזמנה</a></p>
  </div></body></html>`;
};

export const sendNewOrderAdminEmail = async (payload: AdminOrderEmailPayload) => {
  const resendApiKey = process.env.RESEND_API_KEY || process.env.resend_KEY;
  if (!resendApiKey) return { sent: false as const, reason: "missing_resend_api_key" };
  if (payload.to.length === 0) return { sent: false as const, reason: "no_recipients" };

  const from = process.env.ORDER_CONFIRMATION_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: payload.to,
        subject: buildAdminOrderSubject(payload),
        html: buildAdminOrderHtml(payload),
        text: buildAdminOrderText(payload),
        reply_to: payload.customerEmail ?? undefined,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to send new-order admin email:", errorText);
      return { sent: false as const, reason: errorText };
    }
    const data = (await response.json().catch(() => null)) as { id?: string } | null;
    return { sent: true as const, id: data?.id };
  } catch (error) {
    console.error("New-order admin email request failed:", error);
    return { sent: false as const, reason: error instanceof Error ? error.message : "unknown_error" };
  }
};
