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
  currencyCode?: string;
  shippingAddress?: OrderEmailAddress | null;
  confirmationUrl: string;
  siteUrl: string;
  simulated?: boolean;
};

const DEFAULT_SUPPORT_EMAIL = "support@mothersday.co.il";
const DEFAULT_ORDER_CONFIRMATION_FROM = "יום האם <orders@noreply.mothersday.co.il>";

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

const buildLineItemsHtml = (
  lineItems: OrderEmailLineItem[],
  currencyCode: string
) =>
  lineItems
    .map((item) => {
      const lineTotal = Number(item.price) * item.quantity;

      return `
        <tr>
          <td align="right" style="padding:10px 0;font-size:15px;line-height:1.5;color:#4d3c40;">
            ${escapeHtml(item.title)}
          </td>
          <td align="center" style="padding:10px 0;font-size:14px;color:#6b5b60;white-space:nowrap;">
            ${item.quantity}
          </td>
          <td align="left" style="padding:10px 0;font-size:14px;color:#4d3c40;white-space:nowrap;">
            ${escapeHtml(formatCurrency(lineTotal, currencyCode))}
          </td>
        </tr>
      `;
    })
    .join("");

const buildAddressHtml = (shippingAddress?: OrderEmailAddress | null) => {
  if (!shippingAddress) {
    return "";
  }

  const lines = [
    shippingAddress.full_name,
    shippingAddress.street,
    shippingAddress.city,
    shippingAddress.phone ? `טלפון: ${shippingAddress.phone}` : "",
  ].filter(Boolean);

  if (lines.length === 0) {
    return "";
  }

  return `
    <tr>
      <td style="padding:0 32px 24px;">
        <div style="background-color:#faf6f2;padding:16px 18px;text-align:right;">
          <div style="font-size:14px;font-weight:bold;color:#4d3c40;margin-bottom:8px;">כתובת למשלוח</div>
          <div style="font-size:14px;line-height:1.8;color:#6b5b60;">
            ${lines.map((line) => escapeHtml(line)).join("<br />")}
          </div>
        </div>
      </td>
    </tr>
  `;
};

const buildHtml = ({
  orderNumber,
  lineItems,
  totalPrice,
  shippingCost,
  currencyCode = "ILS",
  shippingAddress,
  confirmationUrl,
  siteUrl,
  simulated = false,
}: Omit<OrderEmailPayload, "to">) => {
  const logoUrl = `${siteUrl.replace(/\/$/, "")}/logo.png`;
  const supportEmail = process.env.SUPPORT_EMAIL || DEFAULT_SUPPORT_EMAIL;
  const simulationBanner = simulated
    ? `
      <tr>
        <td align="center" style="padding:0 32px 20px;">
          <div style="background-color:#f7ede5;color:#7a5d4f;font-size:13px;line-height:1.7;padding:12px 16px;text-align:center;">
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
</head>
<body style="margin:0;padding:0;background-color:#f4ede7;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4ede7;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background-color:#ffffff;max-width:480px;width:100%;">
          <tr>
            <td align="center" style="padding:32px 24px 16px;">
              <img src="${escapeHtml(logoUrl)}" alt="יום האם" height="60" style="height:60px;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:0 24px 8px;">
              <h1 style="margin:0;font-size:22px;color:#4d3c40;">ההזמנה שלך התקבלה</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:8px 32px 24px;font-size:15px;line-height:1.7;color:#6b5b60;">
              מספר הזמנה <strong style="color:#4d3c40;">#${orderNumber}</strong><br />
              תודה שבחרת ביום האם. ריכזנו כאן את פרטי ההזמנה שלך.
            </td>
          </tr>
          ${simulationBanner}
          <tr>
            <td style="padding:0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <tr>
                  <td align="right" style="padding-bottom:10px;font-size:14px;font-weight:bold;color:#4d3c40;border-bottom:1px solid #e8ddd4;">מוצר</td>
                  <td align="center" style="padding-bottom:10px;font-size:14px;font-weight:bold;color:#4d3c40;border-bottom:1px solid #e8ddd4;">כמות</td>
                  <td align="left" style="padding-bottom:10px;font-size:14px;font-weight:bold;color:#4d3c40;border-bottom:1px solid #e8ddd4;">סכום</td>
                </tr>
                ${buildLineItemsHtml(lineItems, currencyCode)}
                <tr>
                  <td colspan="3" style="padding-top:12px;border-top:1px solid #e8ddd4;"></td>
                </tr>
                <tr>
                  <td colspan="2" align="right" style="padding:4px 0;font-size:14px;color:#6b5b60;">משלוח</td>
                  <td align="left" style="padding:4px 0;font-size:14px;color:#4d3c40;">
                    ${escapeHtml(formatCurrency(shippingCost, currencyCode))}
                  </td>
                </tr>
                <tr>
                  <td colspan="2" align="right" style="padding:8px 0 0;font-size:16px;font-weight:bold;color:#4d3c40;">סה״כ</td>
                  <td align="left" style="padding:8px 0 0;font-size:16px;font-weight:bold;color:#4d3c40;">
                    ${escapeHtml(formatCurrency(totalPrice, currencyCode))}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${buildAddressHtml(shippingAddress)}
          <tr>
            <td align="center" style="padding:0 32px 32px;">
              <a href="${escapeHtml(confirmationUrl)}"
                 style="display:inline-block;padding:14px 40px;background-color:#4d3c40;color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;">
                לצפייה באישור ההזמנה
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px;">
              <hr style="border:none;border-top:1px solid #e8ddd4;margin:0;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:20px 32px 28px;font-size:12px;color:#a09090;line-height:1.7;">
              לכל שאלה אפשר לענות למייל הזה או לפנות אלינו ב-${escapeHtml(supportEmail)}
              <br />יום האם — מוצרי תכנון לאימהות
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
  currencyCode = "ILS",
  shippingAddress,
  confirmationUrl,
  simulated = false,
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
    `ההזמנה שלך התקבלה`,
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
    `משלוח: ${formatCurrency(shippingCost, currencyCode)}`,
    `סה"כ: ${formatCurrency(totalPrice, currencyCode)}`,
    addressLines.length ? "" : "",
    addressLines.length ? "כתובת למשלוח:" : "",
    ...addressLines,
    "",
    `לצפייה באישור ההזמנה: ${confirmationUrl}`,
    "",
    "יום האם",
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
  const replyTo =
    process.env.ORDER_CONFIRMATION_REPLY_TO ||
    supportEmail;

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
