import { describe, expect, it } from "vitest";
import { formatShortageMessage, itemTitle, parseAlertEmails } from "./inventory.js";

describe("parseAlertEmails", () => {
  it("splits on commas, semicolons and whitespace, lowercases, dedupes", () => {
    expect(parseAlertEmails(" Eden@mothersday.co.il, oron@mothersday.co.il;eden@mothersday.co.il ")).toEqual([
      "eden@mothersday.co.il",
      "oron@mothersday.co.il",
    ]);
  });
  it("drops blanks and non-addresses", () => {
    expect(parseAlertEmails("nope, , a@b.co")).toEqual(["a@b.co"]);
    expect(parseAlertEmails(undefined)).toEqual([]);
  });
});

describe("formatShortageMessage", () => {
  it("names the item, what is left and what was asked", () => {
    expect(
      formatShortageMessage([
        { variant_id: "v1", title: "מחברת שורות קטנה", requested: 3, available: 2 },
        { variant_id: "v2", title: "בלוק תכנון גדול", requested: 1, available: 0 },
      ]),
    ).toBe("מחברת שורות קטנה: נשארו 2 יח׳ (ביקשת 3); בלוק תכנון גדול: אזל מהמלאי");
  });
});

describe("itemTitle", () => {
  it("appends a real variant title and hides the default one", () => {
    expect(itemTitle("לוח משפחתי שבועי", "ריפיל — דפים בלבד")).toBe("לוח משפחתי שבועי — ריפיל — דפים בלבד");
    expect(itemTitle("לוח שבועי", "Default Title")).toBe("לוח שבועי");
    expect(itemTitle("לוח שבועי", null)).toBe("לוח שבועי");
  });
});
