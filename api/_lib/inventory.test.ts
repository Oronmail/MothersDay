import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  checkOrderStock,
  collectLowStockForOrder,
  formatShortageMessage,
  itemTitle,
  parseAlertEmails,
  stampLowStockAlerted,
  type LowStockItem,
  type StockShortage,
} from "./inventory.js";

/**
 * Minimal fake Supabase client for the RPC/`from()` calls the module under
 * test makes. `from(table)` returns a chainable stub — `select/eq/in/update`
 * all return the same stub (so any chain shape resolves), and the stub is
 * itself thenable, resolving to the `{ data, error }` configured for that
 * table. `rpc(name)` resolves per name. One stub per table is memoized so a
 * test can inspect the calls made to it (e.g. `builders.kit_stock.in`).
 */
type FakeResult = { data?: unknown; error?: unknown };

function makeBuilder(result: FakeResult) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.in = vi.fn(chain);
  builder.update = vi.fn(chain);
  builder.then = (resolve: (v: FakeResult) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return builder;
}

function createFakeSupabase(config: { rpc?: Record<string, FakeResult>; tables?: Record<string, FakeResult> }) {
  const builders: Record<string, ReturnType<typeof makeBuilder>> = {};
  const from = vi.fn((table: string) => {
    builders[table] ??= makeBuilder(config.tables?.[table] ?? { data: null, error: null });
    return builders[table];
  });
  const rpc = vi.fn(async (name: string) => config.rpc?.[name] ?? { data: null, error: null });
  return { client: { from, rpc } as unknown as SupabaseClient, builders };
}

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

describe("checkOrderStock", () => {
  it("returns the RPC rows as-is when there are shortages", async () => {
    const shortages: StockShortage[] = [{ variant_id: "v1", title: "מחברת", requested: 3, available: 1 }];
    const { client } = createFakeSupabase({ rpc: { check_order_stock: { data: shortages, error: null } } });

    await expect(
      checkOrderStock(client, [{ product_id: "p1", variant_id: "v1", quantity: 3 }]),
    ).resolves.toEqual(shortages);
  });

  it("fails open — resolves [] and warns once — when the RPC is missing (PGRST202)", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { client } = createFakeSupabase({
      rpc: { check_order_stock: { data: null, error: { code: "PGRST202", message: "function not found" } } },
    });

    await expect(checkOrderStock(client, [])).resolves.toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it("rejects for any other RPC error", async () => {
    const { client } = createFakeSupabase({
      rpc: { check_order_stock: { data: null, error: { code: "500", message: "boom" } } },
    });

    await expect(checkOrderStock(client, [])).rejects.toThrow(/^check_order_stock failed:/);
  });
});

describe("collectLowStockForOrder", () => {
  it("returns only the low variant, with its product title alone and only the blocked kit", async () => {
    const { client } = createFakeSupabase({
      rpc: {
        order_stock_lines: {
          data: [
            { variant_id: "v-low", qty: 1 },
            { variant_id: "v-ok", qty: 1 },
          ],
          error: null,
        },
      },
      tables: {
        variant_stock: {
          data: [
            {
              variant_id: "v-low",
              product_title: "לוח שבועי",
              variant_title: "Default Title",
              sku: "SKU-1",
              available: 1,
              threshold: 3,
              status: "low",
              low_stock_alerted_at: null,
            },
            {
              variant_id: "v-ok",
              product_title: "לוח אחר",
              variant_title: null,
              sku: "SKU-2",
              available: 10,
              threshold: 3,
              status: "ok",
              low_stock_alerted_at: null,
            },
          ],
          error: null,
        },
        kit_stock: {
          data: [
            { bundle_title: "ערכת השראה", can_build: 0, limiting_variant_id: "v-low" },
            { bundle_title: "ערכה אחרת", can_build: 3, limiting_variant_id: "v-ok" },
          ],
          error: null,
        },
      },
    });

    const result = await collectLowStockForOrder(client, "order-1");

    const expected: LowStockItem[] = [
      {
        kind: "variant",
        id: "v-low",
        title: "לוח שבועי",
        sku: "SKU-1",
        available: 1,
        threshold: 3,
        status: "low",
        blockedKits: ["ערכת השראה"],
      },
    ];
    expect(result).toEqual(expected);
  });

  it("returns [] and logs when the variant_stock read fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { client } = createFakeSupabase({
      rpc: { order_stock_lines: { data: [{ variant_id: "v-low", qty: 1 }], error: null } },
      tables: { variant_stock: { data: null, error: { message: "boom" } } },
    });

    await expect(collectLowStockForOrder(client, "order-1")).resolves.toEqual([]);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});

describe("stampLowStockAlerted", () => {
  it("updates inventory_levels and packaging_supplies with an ISO timestamp when both kinds are present", async () => {
    const { client, builders } = createFakeSupabase({
      tables: {
        inventory_levels: { data: null, error: null },
        packaging_supplies: { data: null, error: null },
      },
    });
    const items: LowStockItem[] = [
      { kind: "variant", id: "v1", title: "x", sku: null, available: 0, threshold: 3, status: "out", blockedKits: [] },
      { kind: "supply", id: "s1", title: "y", sku: null, available: 0, threshold: 3, status: "out", blockedKits: [] },
    ];

    await stampLowStockAlerted(client, items);

    expect(builders.inventory_levels.update).toHaveBeenCalledTimes(1);
    const [levelsPayload] = (builders.inventory_levels.update as ReturnType<typeof vi.fn>).mock.calls[0] as [
      { low_stock_alerted_at: string },
    ];
    expect(levelsPayload.low_stock_alerted_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(builders.inventory_levels.in).toHaveBeenCalledWith("variant_id", ["v1"]);

    expect(builders.packaging_supplies.update).toHaveBeenCalledTimes(1);
    expect(builders.packaging_supplies.in).toHaveBeenCalledWith("id", ["s1"]);
  });

  it("never touches packaging_supplies when there are no supply items", async () => {
    const { client, builders } = createFakeSupabase({
      tables: { inventory_levels: { data: null, error: null } },
    });
    const items: LowStockItem[] = [
      { kind: "variant", id: "v1", title: "x", sku: null, available: 0, threshold: 3, status: "out", blockedKits: [] },
    ];

    await stampLowStockAlerted(client, items);

    expect(builders.inventory_levels.update).toHaveBeenCalledTimes(1);
    expect(builders.packaging_supplies).toBeUndefined();
  });
});
