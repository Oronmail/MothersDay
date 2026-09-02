type ShippedEmailAddress = {
  full_name?: string;
  street?: string;
  city?: string;
};

type ShippedEmailPayload = {
  to: string;
  orderNumber: number;
  shipmentNumber: string;
  /** Public HFD tracking page (run.hfd.co.il/info/{rand}); omit if HFD returned no rand. */
  trackingUrl?: string | null;
  shippingAddress?: ShippedEmailAddress | null;
};

const DEFAULT_SUPPORT_EMAIL = "support@mothersday.co.il";
const DEFAULT_ORDER_CONFIRMATION_FROM = "יום האם <orders@noreply.mothersday.co.il>";

// Same design language as orderConfirmationEmail.ts (the welcome-popup card):
// wine logo band, cream card, heart, FbEinstein headline, plum button.
const CANONICAL_SITE = "https://www.mothersday.co.il";
const HEADER_IMAGE = `${CANONICAL_SITE}/email/order-header-band.png`;
const HEART_IMAGE = `${CANONICAL_SITE}/email/heart-icon.png`;
const UNDERLINE_IMAGE = `${CANONICAL_SITE}/email/title-underline.png`;
const DISPLAY_FONT_URL = `${CANONICAL_SITE}/fonts/FbEinstein-ConThin.woff2`;

const BODY_BG = "#ece7e1";
const CARD_BG = "#f8f6f2";
const BORDER = "#ded8d1";
const INK = "#66574c";
const INK_SOFT = "#8a7e74";
const PLUM = "#4d3c40";
const BLOCK_BG = "#edeae4";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildAddressHtml = (shippingAddress?: ShippedEmailAddress | null) => {
  if (!shippingAddress) return "";
  const lines = [shippingAddress.full_name, shippingAddress.street, shippingAddress.city].filter(
    (line): line is string => Boolean(line),
  );
  if (lines.length === 0) return "";

  return `
    <tr>
      <td class="inner-pad" style="padding:0 28px 26px;">
        <div style="background-color:${BLOCK_BG};border:1px solid ${BORDER};padding:16px 18px;text-align:right;">
          <div style="font-size:13px;font-weight:bold;color:${PLUM};margin-bottom:8px;">החבילה בדרך אל</div>
          <div style="font-size:14px;line-height:1.8;color:${INK};">
            ${lines.map((line) => escapeHtml(line)).join("<br />")}
          </div>
        </div>
      </td>
    </tr>
  `;
};

const buildHtml = ({
  orderNumber,
  shipmentNumber,
  trackingUrl,
  shippingAddress,
}: Omit<ShippedEmailPayload, "to">) => {
  const supportEmail = process.env.SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL;
  const ctaHtml = trackingUrl
    ? `
          <tr>
            <td class="inner-pad" style="padding:2px 28px 12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" bgcolor="${PLUM}">
                    <a href="${escapeHtml(trackingUrl)}"
                       style="display:block;padding:14px 20px;background-color:${PLUM};color:#ffffff;text-decoration:none;font-size:15px;letter-spacing:1px;">
                      למעקב אחר המשלוח
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
    : "";

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
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
  <div style="display:none;max-height:0;overflow:hidden;">הזמנה מספר ${orderNumber} נמסרה לשליח - אפשר לעקוב אחרי החבילה</div>
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

          <tr>
            <td align="center" style="padding:32px 28px 0;">
              <img src="${HEART_IMAGE}" alt="" width="36" height="36"
                   style="display:block;width:36px;height:36px;border:0;margin:0 auto;" />
            </td>
          </tr>

          <tr>
            <td align="center" class="inner-pad" style="padding:10px 28px 0;">
              <h1 class="headline" style="margin:0;font-family:'FbEinstein','Assistant',Arial,sans-serif;font-weight:bold;font-size:34px;line-height:1.2;color:${INK};">
                ההזמנה שלך בדרך!
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
              הזמנה <strong style="color:${PLUM};">#${orderNumber}</strong> נמסרה לשליח של HFD.<br />
              מספר משלוח <strong style="color:${PLUM};" dir="ltr">${escapeHtml(shipmentNumber)}</strong>
            </td>
          </tr>

          ${buildAddressHtml(shippingAddress)}
          ${ctaHtml}

          <tr>
            <td align="center" style="padding:6px 28px 8px;font-size:13.5px;color:${INK_SOFT};line-height:1.7;">
              השליח ייצור קשר לפני המסירה. לא הייתם בבית? הוא ינסה שוב ביום העסקים הבא.
            </td>
          </tr>

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
  shipmentNumber,
  trackingUrl,
  shippingAddress,
}: Omit<ShippedEmailPayload, "to">) => {
  const addressLines = shippingAddress
    ? [shippingAddress.full_name, shippingAddress.street, shippingAddress.city].filter(Boolean)
    : [];

  return [
    `ההזמנה שלך בדרך!`,
    `הזמנה #${orderNumber} נמסרה לשליח של HFD.`,
    `מספר משלוח: ${shipmentNumber}`,
    addressLines.length ? "" : "",
    addressLines.length ? "החבילה בדרך אל:" : "",
    ...addressLines,
    "",
    trackingUrl ? `למעקב אחר המשלוח: ${trackingUrl}` : "",
    "השליח ייצור קשר לפני המסירה.",
    "",
    "כי מגיע לך יום האם טוב יותר",
    "עדן, יום האם",
  ]
    .filter(Boolean)
    .join("\n");
};

export const sendOrderShippedEmail = async (payload: ShippedEmailPayload) => {
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
        subject: `הזמנה #${payload.orderNumber} בדרך אלייך | יום האם`,
        html: buildHtml(payload),
        text: buildText(payload),
        reply_to: replyTo,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to send order shipped email:", errorText);
      return { sent: false as const, reason: errorText };
    }

    const data = (await response.json().catch(() => null)) as { id?: string } | null;
    return { sent: true as const, id: data?.id };
  } catch (error) {
    console.error("Order shipped email request failed:", error);
    return {
      sent: false as const,
      reason: error instanceof Error ? error.message : "unknown_error",
    };
  }
};
