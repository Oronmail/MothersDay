import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side inventory helpers (service role). The database owns the rules
 * (spec §4); these functions only call the RPCs/views and shape the results
 * for the order API and the owners' emails.
 */

export interface StockLineInput {
  product_id: string;
  variant_id: string;
  quantity: number;
}

export interface StockShortage {
  variant_id: string;
  title: string;
  requested: number;
  available: number;
}

/**
 * Shortages for a cart, kits exploded to parts by the database. [] = every line fits.
 * Fails OPEN if the inventory migration is not applied yet (function missing).
 */
export async function checkOrderStock(
  supabase: SupabaseClient,
  items: StockLineInput[],
): Promise<StockShortage[]> {
  const { data, error } = await supabase.rpc("check_order_stock", { p_items: items });
  if (error) {
    if (error.code === "PGRST202") {
      console.warn("check_order_stock: RPC missing (inventory migration not applied) — skipping stock check");
      return [];
    }
    throw new Error(`check_order_stock failed: ${error.message}`);
  }
  return (data ?? []) as StockShortage[];
}

/** Customer-facing Hebrew, e.g. "מחברת שורות קטנה: נשארו 2 יח׳ (ביקשת 3)". */
export function formatShortageMessage(shortages: StockShortage[]): string {
  return shortages
    .map((s) =>
      s.available <= 0
        ? `${s.title}: אזל מהמלאי`
        : `${s.title}: ${s.available === 1 ? "נשארה יחידה אחת" : `נשארו ${s.available} יח׳`} (ביקשת ${s.requested})`,
    )
    .join("; ");
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** "a@x.co.il, B@x.co.il" → ["a@x.co.il", "b@x.co.il"]; blanks and junk dropped, deduped. */
export function parseAlertEmails(raw: string | undefined | null): string[] {
  const seen = new Set<string>();
  for (const part of (raw ?? "").split(/[,;\s]+/)) {
    const email = part.trim().toLowerCase();
    if (email && EMAIL_RE.test(email)) seen.add(email);
  }
  return [...seen];
}

const DEFAULT_VARIANT_TITLES = new Set(["Default Title", "ברירת מחדל"]);

export function itemTitle(productTitle: string, variantTitle: string | null | undefined): string {
  return variantTitle && !DEFAULT_VARIANT_TITLES.has(variantTitle)
    ? `${productTitle} — ${variantTitle}`
    : productTitle;
}

export interface LowStockItem {
  kind: "variant" | "supply";
  id: string;
  title: string;
  sku: string | null;
  available: number;
  threshold: number;
  status: "low" | "out" | "short";
  blockedKits: string[];
}

/** "בלוק תכנון גדול (BLK-L): נשארו 3 (סף 5) — חוסם: מארז יין" — shared by the owners' emails. */
export const formatLowStockLine = (i: LowStockItem): string =>
  `${i.title}${i.sku ? ` (${i.sku})` : ""}: ${i.available === 1 ? "נשארה יחידה אחת" : `נשארו ${i.available}`} (סף ${i.threshold})` +
  (i.blockedKits.length ? ` — חוסם: ${i.blockedKits.join(", ")}` : "");

interface VariantStockRow {
  variant_id: string;
  product_title: string;
  variant_title: string | null;
  sku: string | null;
  available: number | null;
  threshold: number;
  status: string;
  low_stock_alerted_at: string | null;
}

interface KitStockRow {
  bundle_title: string;
  can_build: number | null;
  limiting_variant_id: string | null;
}

interface SupplyStockRow {
  supply_id: string;
  name: string;
  sku: string | null;
  on_hand: number;
  threshold: number;
  status: string;
  low_stock_alerted_at: string | null;
}

const isLowStatus = (status: string): status is LowStockItem["status"] =>
  status === "low" || status === "out" || status === "short";

/** Variants sold in this order that are now at/under threshold and have not been alerted yet. */
export async function collectLowStockForOrder(supabase: SupabaseClient, orderId: string): Promise<LowStockItem[]> {
  const { data: lines, error: linesError } = await supabase.rpc("order_stock_lines", { p_order_id: orderId });
  if (linesError || !Array.isArray(lines) || lines.length === 0) {
    if (linesError && linesError.code !== "PGRST202") console.error("order_stock_lines failed", orderId, linesError);
    return [];
  }
  const variantIds = (lines as Array<{ variant_id: string }>).map((l) => l.variant_id);

  const { data: rows, error } = await supabase
    .from("variant_stock")
    .select("variant_id, product_title, variant_title, sku, available, threshold, status, low_stock_alerted_at")
    .in("variant_id", variantIds);
  if (error) {
    console.error("variant_stock read failed", orderId, error);
    return [];
  }
  const hits = ((rows ?? []) as VariantStockRow[]).filter((r) => isLowStatus(r.status) && !r.low_stock_alerted_at);
  if (hits.length === 0) return [];

  const { data: kits, error: kitsError } = await supabase
    .from("kit_stock")
    .select("bundle_title, can_build, limiting_variant_id")
    .in("limiting_variant_id", hits.map((h) => h.variant_id));
  if (kitsError) console.error("kit_stock read failed", orderId, kitsError);
  const blocked = new Map<string, string[]>();
  for (const k of (kits ?? []) as KitStockRow[]) {
    if (k.limiting_variant_id && (k.can_build ?? 1) <= 0) {
      blocked.set(k.limiting_variant_id, [...(blocked.get(k.limiting_variant_id) ?? []), k.bundle_title]);
    }
  }

  return hits.map((r) => ({
    kind: "variant",
    id: r.variant_id,
    title: itemTitle(r.product_title, r.variant_title),
    sku: r.sku,
    available: r.available ?? 0,
    threshold: r.threshold,
    status: r.status as LowStockItem["status"],
    blockedKits: blocked.get(r.variant_id) ?? [],
  }));
}

/** Packaging supplies consumed by this order (shipped) that are now low and not yet alerted. */
export async function collectLowStockSupplies(supabase: SupabaseClient, orderId: string): Promise<LowStockItem[]> {
  const { data: moves, error: movesError } = await supabase
    .from("inventory_movements")
    .select("supply_id")
    .eq("order_id", orderId)
    .eq("reason", "consume");
  if (movesError) console.error("inventory_movements read failed", orderId, movesError);
  if (movesError || !moves?.length) return [];
  const supplyIds = moves.map((m: { supply_id: string }) => m.supply_id);

  const { data: rows, error } = await supabase
    .from("supply_stock")
    .select("supply_id, name, sku, on_hand, threshold, status, low_stock_alerted_at")
    .in("supply_id", supplyIds);
  if (error) {
    console.error("supply_stock read failed", orderId, error);
    return [];
  }
  return ((rows ?? []) as SupplyStockRow[])
    .filter((r) => isLowStatus(r.status) && !r.low_stock_alerted_at)
    .map((r) => ({
      kind: "supply",
      id: r.supply_id,
      title: r.name,
      sku: r.sku,
      available: r.on_hand,
      threshold: r.threshold,
      status: r.status as LowStockItem["status"],
      blockedKits: [],
    }));
}

/** Marks items as alerted so the next dip (after a restock clears the stamp) alerts again. */
export async function stampLowStockAlerted(supabase: SupabaseClient, items: LowStockItem[]): Promise<void> {
  const now = new Date().toISOString();
  const variantIds = items.filter((i) => i.kind === "variant").map((i) => i.id);
  const supplyIds = items.filter((i) => i.kind === "supply").map((i) => i.id);
  if (variantIds.length) {
    const { error } = await supabase.from("inventory_levels").update({ low_stock_alerted_at: now }).in("variant_id", variantIds);
    if (error) console.error("stampLowStockAlerted levels failed", error);
  }
  if (supplyIds.length) {
    const { error } = await supabase.from("packaging_supplies").update({ low_stock_alerted_at: now }).in("id", supplyIds);
    if (error) console.error("stampLowStockAlerted supplies failed", error);
  }
}
