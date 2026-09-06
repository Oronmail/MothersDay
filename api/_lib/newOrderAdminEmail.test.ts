import { describe, expect, it } from "vitest";
import {
  buildAdminOrderSubject,
  buildAdminOrderText,
  type AdminOrderEmailPayload,
} from "./newOrderAdminEmail.js";

const base: AdminOrderEmailPayload = {
  to: ["eden@mothersday.co.il", "oron@mothersday.co.il"],
  orderNumber: 1042,
  customerName: "דנה כהן",
  customerEmail: "dana@example.com",
  customerPhone: "+972501234567",
  city: "תל אביב",
  items: [
    { title: "מארז יין", quantity: 1, price: 180, parts: [{ title: "תכנון ארוחות משפחתי שבועי", quantity: 1 }, { title: "בלוק תכנון גדול", quantity: 1 }] },
    { title: "מחברת שורות קטנה", quantity: 2, price: 45 },
  ],
  subtotal: 270,
  discountCode: "WELCOME10",
  discountAmount: 27,
  shippingCost: 0,
  total: 243,
  paymentMethod: "credit-card",
  cardLast4: "1234",
  adminUrl: "https://www.mothersday.co.il/admin/orders/abc",
  lowStock: [],
  simulated: false,
};

describe("buildAdminOrderSubject", () => {
  it("names the order, the customer and the total", () => {
    expect(buildAdminOrderSubject(base)).toBe("הזמנה חדשה #1042 · דנה כהן · ₪243");
  });
  it("marks simulated orders", () => {
    expect(buildAdminOrderSubject({ ...base, simulated: true })).toBe("[בדיקה] הזמנה חדשה #1042 · דנה כהן · ₪243");
  });
});

describe("buildAdminOrderText", () => {
  it("lists items, kit parts, totals and the admin link", () => {
    const text = buildAdminOrderText(base);
    expect(text).toContain("1 × מארז יין");
    expect(text).toContain("  └ 1 × תכנון ארוחות משפחתי שבועי");
    expect(text).toContain("2 × מחברת שורות קטנה");
    expect(text).toContain("הנחה (WELCOME10): -₪27");
    expect(text).toContain("סה\"כ: ₪243");
    expect(text).toContain("https://www.mothersday.co.il/admin/orders/abc");
    expect(text).not.toContain("מלאי נמוך");
  });
  it("adds the low-stock section only when there are items", () => {
    const text = buildAdminOrderText({
      ...base,
      lowStock: [
        { kind: "variant", id: "v", title: "בלוק תכנון גדול", sku: "BLK-L", available: 0, threshold: 5, status: "out", blockedKits: ["מארז יין", "מארז בלוקים"] },
      ],
    });
    expect(text).toContain("מלאי נמוך");
    expect(text).toContain("בלוק תכנון גדול (BLK-L): נשארו 0 (סף 5) — חוסם: מארז יין, מארז בלוקים");
  });
  it("uses the singular phrasing when exactly one unit is left", () => {
    const text = buildAdminOrderText({
      ...base,
      lowStock: [
        { kind: "variant", id: "v", title: "מחברת שורות קטנה", sku: null, available: 1, threshold: 5, status: "low", blockedKits: [] },
      ],
    });
    expect(text).toContain("מחברת שורות קטנה: נשארה יחידה אחת (סף 5)");
  });
});
