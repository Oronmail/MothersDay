import { describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ supabase: {} }));

import { applyAvailability, cartItemMaxQuantity, unitsLeftText, variantMaxQuantity, type AvailabilityRow } from "./availability";
import type { CartItem, ProductEdge } from "./types";

const variant = (id: string, availableForSale = true) => ({
  node: { id, title: "Default Title", price: { amount: "10", currencyCode: "ILS" }, availableForSale, selectedOptions: [] },
});

const edge = (productId: string, variantIds: string[]): ProductEdge =>
  ({ node: { id: productId, title: "t", variants: { edges: variantIds.map((v) => variant(v)) } } }) as unknown as ProductEdge;

describe("applyAvailability", () => {
  it("returns the same edges when the map is empty (fail open)", () => {
    const edges = [edge("p1", ["v1"])];
    expect(applyAvailability(edges, new Map())).toBe(edges);
  });
  it("turns sellable=false into availableForSale=false and copies max_orderable", () => {
    const map = new Map<string, AvailabilityRow>([
      ["v1", { product_id: "p1", variant_id: "v1", sellable: false, max_orderable: 0 }],
      ["v2", { product_id: "p1", variant_id: "v2", sellable: true, max_orderable: 3 }],
    ]);
    const [out] = applyAvailability([edge("p1", ["v1", "v2", "v3"])], map);
    const nodes = out.node.variants.edges.map((e) => e.node);
    expect(nodes[0].availableForSale).toBe(false);
    expect(nodes[0].maxOrderable).toBe(0);
    expect(nodes[1].availableForSale).toBe(true);
    expect(nodes[1].maxOrderable).toBe(3);
    expect(nodes[2].availableForSale).toBe(true); // not in the map → untouched
    expect(nodes[2].maxOrderable).toBeUndefined();
  });
  it("never re-enables a variant the admin switched off", () => {
    const map = new Map<string, AvailabilityRow>([["v1", { product_id: "p1", variant_id: "v1", sellable: true, max_orderable: null }]]);
    const e = edge("p1", ["v1"]);
    e.node.variants.edges[0].node.availableForSale = false;
    expect(applyAvailability([e], map)[0].node.variants.edges[0].node.availableForSale).toBe(false);
  });
});

describe("max quantities", () => {
  it("caps at MAX_ITEM_QUANTITY when there is no stock limit", () => {
    expect(variantMaxQuantity(null)).toBe(20);
    expect(variantMaxQuantity(undefined)).toBe(20);
    expect(variantMaxQuantity(50)).toBe(20);
    expect(variantMaxQuantity(3)).toBe(3);
    expect(variantMaxQuantity(0)).toBe(0);
  });
  it("reads the cart item's variant", () => {
    const e = edge("p1", ["v1"]);
    e.node.variants.edges[0].node.maxOrderable = 2;
    const item = { product: e, variantId: "v1", quantity: 1 } as unknown as CartItem;
    expect(cartItemMaxQuantity(item)).toBe(2);
    expect(cartItemMaxQuantity({ ...item, variantId: "missing" } as CartItem)).toBe(20);
  });
});

describe("unitsLeftText", () => {
  it("uses the Hebrew singular for one unit and the plural for the rest", () => {
    expect(unitsLeftText(1)).toBe("נשארה יחידה אחת");
    expect(unitsLeftText(2)).toBe("נשארו 2 יחידות");
    expect(unitsLeftText(0)).toBe("נשארו 0 יחידות");
  });
});
