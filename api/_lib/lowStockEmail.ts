import type { SupabaseClient } from "@supabase/supabase-js";
import { collectLowStockSupplies, parseAlertEmails, stampLowStockAlerted, type LowStockItem } from "./inventory.js";

/** Standalone low-stock email (spec §5): used when a dip happens outside the paid path — supplies consumed at shipping. */

const DEFAULT_FROM = "יום האם <orders@noreply.mothersday.co.il>";
const ADMIN_INVENTORY_URL = "https://www.mothersday.co.il/admin/inventory";

const line = (i: LowStockItem) =>
  `${i.title}${i.sku ? ` (${i.sku})` : ""}: ${i.available === 1 ? "נשארה יחידה אחת" : `נשארו ${i.available}`} (סף ${i.threshold})` +
  (i.blockedKits.length ? ` — חוסם: ${i.blockedKits.join(", ")}` : "");

export const buildLowStockSubject = (items: LowStockItem[]) => {
  const names = items.slice(0, 2).map((i) => i.title).join(", ");
  return `מלאי נמוך: ${names}${items.length > 2 ? ` ועוד ${items.length - 2}` : ""}`;
};

export const buildLowStockText = (items: LowStockItem[], context: string) =>
  ["מלאי נמוך", context, "", ...items.map((i) => `- ${line(i)}`), "", `למסך המלאי: ${ADMIN_INVENTORY_URL}`].join("\n");

export const buildLowStockHtml = (items: LowStockItem[], context: string) =>
  `<!DOCTYPE html><html dir="rtl" lang="he"><body style="font-family:Assistant,Arial,sans-serif;color:#4d3c40;padding:24px">
  <h1 style="font-size:18px">⚠ מלאי נמוך</h1><p>${context}</p>
  <ul>${items.map((i) => `<li>${line(i).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</li>`).join("")}</ul>
  <p><a href="${ADMIN_INVENTORY_URL}">למסך המלאי</a></p></body></html>`;

export const sendLowStockEmail = async (to: string[], items: LowStockItem[], context: string) => {
  const resendApiKey = process.env.RESEND_API_KEY || process.env.resend_KEY;
  if (!resendApiKey) return { sent: false as const, reason: "missing_resend_api_key" };
  if (to.length === 0 || items.length === 0) return { sent: false as const, reason: "nothing_to_send" };
  const from = process.env.ORDER_CONFIRMATION_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: buildLowStockSubject(items), html: buildLowStockHtml(items, context), text: buildLowStockText(items, context) }),
    });
    if (!response.ok) return { sent: false as const, reason: await response.text() };
    return { sent: true as const };
  } catch (error) {
    return { sent: false as const, reason: error instanceof Error ? error.message : "unknown_error" };
  }
};

/** After an order is marked shipped: email the owners about supplies that just dipped. Never throws. */
export async function notifyLowStockSuppliesAfterShipping(supabase: SupabaseClient, orderId: string, orderNumber: number | null): Promise<void> {
  try {
    const to = parseAlertEmails(process.env.ORDER_ALERT_EMAILS);
    if (to.length === 0) return;
    const items = await collectLowStockSupplies(supabase, orderId);
    if (items.length === 0) return;
    const result = await sendLowStockEmail(to, items, `אחרי שידור משלוח להזמנה #${orderNumber ?? ""}`);
    if (result.sent) await stampLowStockAlerted(supabase, items);
    else console.error("low-stock supplies email not sent:", orderId, result.reason);
  } catch (error) {
    console.error("notifyLowStockSuppliesAfterShipping failed:", orderId, error);
  }
}
