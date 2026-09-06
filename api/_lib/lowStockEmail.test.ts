import { describe, expect, it } from "vitest";
import { buildLowStockSubject, buildLowStockText } from "./lowStockEmail.js";
import type { LowStockItem } from "./inventory.js";

const item = (title: string, available: number, blockedKits: string[] = []): LowStockItem =>
  ({ kind: "supply", id: title, title, sku: null, available, threshold: 5, status: available <= 0 ? "out" : "low", blockedKits });

describe("buildLowStockSubject", () => {
  it("names up to two items and counts the rest", () => {
    expect(buildLowStockSubject([item("קופסה", 2)])).toBe("מלאי נמוך: קופסה");
    expect(buildLowStockSubject([item("קופסה", 2), item("כרטיס", 0), item("סרט", 1)])).toBe("מלאי נמוך: קופסה, כרטיס ועוד 1");
  });
});

describe("buildLowStockText", () => {
  it("lists each item with what is left and the context line", () => {
    const text = buildLowStockText([item("קופסה", 2), item("כרטיס", 0, ["מארז יין"])], "אחרי שידור משלוח להזמנה #1042");
    expect(text).toContain("אחרי שידור משלוח להזמנה #1042");
    expect(text).toContain("- קופסה: נשארו 2 (סף 5)");
    expect(text).toContain("- כרטיס: נשארו 0 (סף 5) — חוסם: מארז יין");
  });

  it("uses the singular phrasing when exactly one unit is left", () => {
    const text = buildLowStockText([item("סרט", 1)], "context");
    expect(text).toContain("- סרט: נשארה יחידה אחת (סף 5)");
  });
});
