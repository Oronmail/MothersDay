type OrderEmailLineItem = {
  title: string;
  quantity: number;
  price: string;
};

type OrderEmailAddress = {
  full_name?: string;
  street?: string;
  city?: string;
  phone?: string;
};

type OrderEmailPayload = {
  to: string;
  orderNumber: number;
  lineItems: OrderEmailLineItem[];
  totalPrice: number;
  shippingCost: number;
  discountAmount?: number;
  discountCode?: string | null;
  currencyCode?: string;
  shippingAddress?: OrderEmailAddress | null;
  confirmationUrl: string;
  siteUrl: string;
  simulated?: boolean;
  /** Invoice+ document link (PayPlus), when already issued. */
  invoiceUrl?: string | null;
};

const DEFAULT_SUPPORT_EMAIL = "support@mothersday.co.il";
const DEFAULT_ORDER_CONFIRMATION_FROM = "יום האם <orders@noreply.mothersday.co.il>";

/**
 * Design follows the site's welcome popup (HeroNewsletterCard): the wine logo
 * band opens, then a cream card with the hand-drawn heart, the FbEinstein
 * display headline over the sketch underline, and the plum primary button.
 * Email images always load from the public site — preview deployment URLs sit
 * behind Vercel auth and would break in inboxes.
 */
const CANONICAL_SITE = "https://www.mothersday.co.il";
const HEADER_IMAGE = `${CANONICAL_SITE}/email/order-header-band.png`;
const HEART_IMAGE = `${CANONICAL_SITE}/email/heart-icon.png`;
const UNDERLINE_IMAGE = `${CANONICAL_SITE}/email/title-underline.png`;
const DISPLAY_FONT_URL = `${CANONICAL_SITE}/fonts/FbEinstein-ConThin.woff2`;

// Palette mirrors the site's CSS variables (src/index.css).
const BODY_BG = "#ece7e1"; // deeper cream around the card
const CARD_BG = "#f8f6f2"; // --background (cream)
const BORDER = "#ded8d1"; // --border
const INK = "#66574c"; // --foreground
const INK_SOFT = "#8a7e74"; // foreground at ~70%
const PLUM = "#4d3c40"; // --primary
const BLOCK_BG = "#edeae4"; // address / notice blocks

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatCurrency = (amount: number, currencyCode = "ILS") =>
  new Intl.NumberFormat("he-IL", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(amount);

const buildLineItemsHtml = (lineItems: OrderEmailLineItem[], currencyCode: string) =>
  lineItems
    .map((item) => {
      const lineTotal = Number(item.price) * item.quantity;
      return `
        <tr>
          <td align="right" style="padding:12px 0;font-size:15px;line-height:1.5;color:${INK};border-bottom:1px solid ${BORDER};">
            ${escapeHtml(item.title)}
          </td>
          <td align="center" style="padding:12px 0;font-size:14px;color:${INK_SOFT};white-space:nowrap;border-bottom:1px solid ${BORDER};">
            ${item.quantity}
          </td>
          <td align="left" style="padding:12px 0;font-size:14px;color:${INK};white-space:nowrap;border-bottom:1px solid ${BORDER};">
            ${escapeHtml(formatCurrency(lineTotal, currencyCode))}
          </td>
        </tr>
      `;
    })
    .join("");

const buildAddressHtml = (shippingAddress?: OrderEmailAddress | null) => {
  if (!shippingAddress) return "";
  const lines = [
    shippingAddress.full_name,
    shippingAddress.street,
    shippingAddress.city,
    shippingAddress.phone ? `טלפון: ${shippingAddress.phone}` : "",
  ].filter((line): line is string => Boolean(line));
  if (lines.length === 0) return "";

  return `
    <tr>
      <td class="inner-pad" style="padding:0 28px 26px;">
        <div style="background-color:${BLOCK_BG};border:1px solid ${BORDER};padding:16px 18px;text-align:right;">
          <div style="font-size:13px;font-weight:bold;color:${PLUM};margin-bottom:8px;">כתובת למשלוח</div>
          <div style="font-size:14px;line-height:1.8;color:${INK};">
            ${lines.map((line) => escapeHtml(line)).join("<br />")}
          </div>
        </div>
      </td>
    </tr>
  `;
};

export const buildHtml = ({
  orderNumber,
  lineItems,
  totalPrice,
  shippingCost,
  discountAmount = 0,
  discountCode = null,
  currencyCode = "ILS",
  shippingAddress,
  confirmationUrl,
  siteUrl,
  simulated = false,
  invoiceUrl = null,
}: Omit<OrderEmailPayload, "to">) => {
  void siteUrl; // images/links are pinned to the canonical site (see note above)
  const supportEmail = process.env.SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL;
  const simulationBanner = simulated
    ? `
      <tr>
        <td align="center" class="inner-pad" style="padding:0 28px 20px;">
          <div style="background-color:${BLOCK_BG};border:1px solid ${BORDER};color:${INK};font-size:13px;line-height:1.7;padding:12px 16px;text-align:center;">
            זוהי הזמנה לדוגמה לצורכי בדיקה בלבד. לא בוצע חיוב בפועל.
          </div>
        </td>
      </tr>
    `
    : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    /* The brand display face — honored by Apple Mail and friends, safely
       ignored elsewhere (falls back to the system font). */
    @font-face {
      font-family: 'FbEinstein';
      src: url('${DISPLAY_FONT_URL}') format('woff2');
      font-weight: 300;
      font-style: normal;
    }
    @media only screen and (max-width: 480px) {
      .container { width: 100% !important; }
      .inner-pad { padding-left: 18px !important; padding-right: 18px !important; }
      .headline { font-size: 28px !important; }
      .closing { font-size: 21px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${BODY_BG};font-family:'Assistant',Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;">הזמנה מספר ${orderNumber} התקבלה - כל הפרטים בפנים</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BODY_BG};padding:28px 0;">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" class="container" width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;background-color:${CARD_BG};border:1px solid ${BORDER};">

          <!-- Wine logo band -->
          <tr>
            <td>
              <a href="${CANONICAL_SITE}" style="text-decoration:none;">
                <img src="${HEADER_IMAGE}" alt="יום האם" width="520"
                     style="display:block;width:100%;height:auto;border:0;" />
              </a>
            </td>
          </tr>

          <!-- Popup-card header: heart, display headline, sketch underline -->
          <tr>
            <td align="center" style="padding:32px 28px 0;">
              <img src="${HEART_IMAGE}" alt="" width="36" height="36"
                   style="display:block;width:36px;height:36px;border:0;margin:0 auto;" />
            </td>
          </tr>

          <tr>
            <td align="center" class="inner-pad" style="padding:10px 28px 0;">
              <h1 class="headline" style="margin:0;font-family:'FbEinstein','Assistant',Arial,sans-serif;font-weight:bold;font-size:34px;line-height:1.2;color:${INK};">
                ההזמנה שלך התקבלה!
              </h1>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding:4px 28px 0;">
              <img src="${UNDERLINE_IMAGE}" alt="" width="150"
                   style="display:block;width:150px;height:auto;border:0;margin:0 auto;" />
            </td>
          </tr>

          <tr>
            <td align="center" class="inner-pad" style="padding:12px 32px 28px;font-size:15px;line-height:1.7;color:${INK_SOFT};">
              מספר הזמנה <strong style="color:${PLUM};">#${orderNumber}</strong><br />
              תודה שבחרת ביום האם. ריכזנו כאן את פרטי ההזמנה שלך.
            </td>
          </tr>
          ${simulationBanner}

          <!-- Order lines -->
          <tr>
            <td class="inner-pad" style="padding:0 28px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td align="right" style="padding-bottom:10px;font-size:12px;letter-spacing:1px;font-weight:bold;color:${PLUM};border-bottom:1px solid ${PLUM};">מוצר</td>
                  <td align="center" style="padding-bottom:10px;font-size:12px;letter-spacing:1px;font-weight:bold;color:${PLUM};border-bottom:1px solid ${PLUM};">כמות</td>
                  <td align="left" style="padding-bottom:10px;font-size:12px;letter-spacing:1px;font-weight:bold;color:${PLUM};border-bottom:1px solid ${PLUM};">סכום</td>
                </tr>
                ${buildLineItemsHtml(lineItems, currencyCode)}
                ${
                  discountAmount > 0
                    ? `
                <tr>
                  <td colspan="2" align="right" style="padding:12px 0 0;font-size:14px;color:${INK_SOFT};">הנחה${discountCode ? ` (${escapeHtml(discountCode)})` : ""}</td>
                  <td align="left" style="padding:12px 0 0;font-size:14px;color:${INK};">
                    &#8722;${escapeHtml(formatCurrency(discountAmount, currencyCode))}
                  </td>
                </tr>`
                    : ""
                }
                <tr>
                  <td colspan="2" align="right" style="padding:12px 0 4px;font-size:14px;color:${INK_SOFT};">משלוח</td>
                  <td align="left" style="padding:12px 0 4px;font-size:14px;color:${INK};">
                    ${escapeHtml(shippingCost === 0 ? "חינם" : formatCurrency(shippingCost, currencyCode))}
                  </td>
                </tr>
                <tr>
                  <td colspan="2" align="right" style="padding:8px 0 0;font-size:17px;font-weight:bold;color:${PLUM};">סה״כ</td>
                  <td align="left" style="padding:8px 0 0;font-size:17px;font-weight:bold;color:${PLUM};">
                    ${escapeHtml(formatCurrency(totalPrice, currencyCode))}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${buildAddressHtml(shippingAddress)}

          <!-- CTA + invoice — full-width plum button, like the popup's -->
          <tr>
            <td class="inner-pad" style="padding:2px 28px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" bgcolor="${PLUM}">
                    <a href="${escapeHtml(confirmationUrl)}"
                       style="display:block;padding:14px 20px;background-color:${PLUM};color:#ffffff;text-decoration:none;font-size:15px;letter-spacing:1px;">
                      לצפייה באישור ההזמנה
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${
            invoiceUrl
              ? `
          <tr>
            <td align="center" style="padding:0 28px 8px;font-size:13.5px;">
              <a href="${escapeHtml(invoiceUrl)}" style="color:${INK_SOFT};text-decoration:underline;">לצפייה בחשבונית / קבלה</a>
            </td>
          </tr>`
              : ""
          }

          <!-- Closing line, signed like the popup family -->
          <tr>
            <td align="center" class="inner-pad" style="padding:30px 28px 0;">
              <div class="closing" style="font-family:'FbEinstein','Assistant',Arial,sans-serif;font-weight:bold;font-size:23px;color:${INK};line-height:1.3;">
                כי מגיע לך יום האם טוב יותר
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:12px 28px 30px;">
              <img src="${HEART_IMAGE}" alt="" width="18" height="18"
                   style="display:block;width:18px;height:18px;border:0;margin:0 auto 4px;" />
              <div style="font-size:14px;color:${INK};line-height:1.6;">עדן</div>
            </td>
          </tr>

          <tr>
            <td style="padding:0 28px;">
              <hr style="border:none;border-top:1px solid ${BORDER};margin:0;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:18px 28px 26px;font-size:12px;color:${INK_SOFT};line-height:1.9;">
              <a href="${CANONICAL_SITE}" style="color:${INK_SOFT};text-decoration:none;">mothersday.co.il</a>
              &nbsp;·&nbsp; <a href="mailto:${escapeHtml(supportEmail)}" style="color:${INK_SOFT};text-decoration:underline;">${escapeHtml(supportEmail)}</a>
              <br />אפשר פשוט לענות למייל הזה - אנחנו כאן.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const buildText = ({
  orderNumber,
  lineItems,
  totalPrice,
  shippingCost,
  discountAmount = 0,
  discountCode = null,
  currencyCode = "ILS",
  shippingAddress,
  confirmationUrl,
  simulated = false,
  invoiceUrl = null,
}: Omit<OrderEmailPayload, "to" | "siteUrl">) => {
  const addressLines = shippingAddress
    ? [
        shippingAddress.full_name,
        shippingAddress.street,
        shippingAddress.city,
        shippingAddress.phone ? `טלפון: ${shippingAddress.phone}` : "",
      ].filter(Boolean)
    : [];

  return [
    `ההזמנה שלך התקבלה!`,
    `מספר הזמנה: #${orderNumber}`,
    simulated ? `זוהי הזמנה לדוגמה לצורכי בדיקה בלבד. לא בוצע חיוב.` : "",
    "",
    "פרטי ההזמנה:",
    ...lineItems.map(
      (item) =>
        `- ${item.title} | כמות: ${item.quantity} | ${formatCurrency(
          Number(item.price) * item.quantity,
          currencyCode
        )}`
    ),
    discountAmount > 0
      ? `הנחה${discountCode ? ` (${discountCode})` : ""}: -${formatCurrency(discountAmount, currencyCode)}`
      : "",
    `משלוח: ${shippingCost === 0 ? "חינם" : formatCurrency(shippingCost, currencyCode)}`,
    `סה"כ: ${formatCurrency(totalPrice, currencyCode)}`,
    addressLines.length ? "" : "",
    addressLines.length ? "כתובת למשלוח:" : "",
    ...addressLines,
    "",
    `לצפייה באישור ההזמנה: ${confirmationUrl}`,
    invoiceUrl ? `לצפייה בחשבונית / קבלה: ${invoiceUrl}` : "",
    "",
    "כי מגיע לך יום האם טוב יותר",
    "עדן, יום האם",
  ]
    .filter(Boolean)
    .join("\n");
};

export const sendOrderConfirmationEmail = async (payload: OrderEmailPayload) => {
  const resendApiKey = process.env.RESEND_API_KEY || process.env.resend_KEY;
  const supportEmail = process.env.SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL;

  if (!resendApiKey) {
    return { sent: false as const, reason: "missing_resend_api_key" };
  }

  const from =
    process.env.ORDER_CONFIRMATION_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    DEFAULT_ORDER_CONFIRMATION_FROM;
  const replyTo = process.env.ORDER_CONFIRMATION_REPLY_TO || supportEmail;

  const subject = payload.simulated
    ? `הזמנה לדוגמה #${payload.orderNumber} התקבלה | יום האם`
    : `הזמנה #${payload.orderNumber} התקבלה | יום האם`;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: payload.to,
        subject,
        html: buildHtml(payload),
        text: buildText(payload),
        reply_to: replyTo,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to send order confirmation email:", errorText);
      return { sent: false as const, reason: errorText };
    }

    const data = (await response.json().catch(() => null)) as { id?: string } | null;
    return { sent: true as const, id: data?.id };
  } catch (error) {
    console.error("Order confirmation email request failed:", error);
    return {
      sent: false as const,
      reason: error instanceof Error ? error.message : "unknown_error",
    };
  }
};
