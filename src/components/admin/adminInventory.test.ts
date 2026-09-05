import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

import {
  formatDelta, movementsToCsv, sortByUrgency, stockStatusBadge, variantDisplayTitle, type MovementLogRow,
} from "./adminInventory";

describe("stockStatusBadge", () => {
  it("maps every status to Hebrew", () => {
    expect(stockStatusBadge("ok").label).toBe("תקין");
    expect(stockStatusBadge("low").label).toBe("נמוך");
    expect(stockStatusBadge("out").label).toBe("אזל");
    expect(stockStatusBadge("short").label).toBe("חוסר");
    expect(stockStatusBadge("untracked").label).toBe("לא במעקב");
  });
});

describe("sortByUrgency", () => {
  it("puts short, out, low before ok and untracked, then by title", () => {
    const rows = [
      { status: "ok", title: "ב" }, { status: "untracked", title: "א" }, { status: "low", title: "ג" },
      { status: "short", title: "ד" }, { status: "out", title: "ה" }, { status: "ok", title: "א" },
    ] as const;
    expect(sortByUrgency([...rows], (r) => r.title).map((r) => `${r.status}:${r.title}`)).toEqual([
      "short:ד", "out:ה", "low:ג", "ok:א", "ok:ב", "untracked:א",
    ]);
  });
});

describe("variantDisplayTitle", () => {
  it("hides the default variant title", () => {
    expect(variantDisplayTitle({ product_title: "לוח שבועי", variant_title: "Default Title" })).toBe("לוח שבועי");
    expect(variantDisplayTitle({ product_title: "לוח משפחתי שבועי", variant_title: "ריפיל — דפים בלבד" })).toBe("לוח משפחתי שבועי · ריפיל — דפים בלבד");
  });
});

describe("formatDelta", () => {
  it("signs positives", () => {
    expect(formatDelta(3)).toBe("+3");
    expect(formatDelta(-2)).toBe("−2");
  });
});

describe("movementsToCsv", () => {
  it("writes a header, quotes fields with commas or quotes", () => {
    const row: MovementLogRow = {
      id: 1, created_at: "2026-09-06T08:00:00Z", delta: -2, on_hand_after: 5, reason: "sale", order_id: "o",
      reference: null, note: 'הערה, עם "מרכאות"', variant_id: "v", supply_id: null, item_kind: "variant",
      item_title: "מחברת שורות קטנה", sku: "NB-S", order_number: 1042, actor_email: null,
    };
    const csv = movementsToCsv([row]);
    const [header, line] = csv.split("\n");
    expect(header).toBe('תאריך,פריט,"מק""ט",שינוי,מלאי אחרי,סיבה,הזמנה,אסמכתא,הערה,בוצע על ידי');
    expect(line).toContain('"הערה, עם ""מרכאות"""');
    expect(line).toContain("מכירה");
    expect(line).toContain("1042");
  });
});
