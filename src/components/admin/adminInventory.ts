// Shared types and helpers for the admin inventory screens (מלאי).
// Rows come from the staff views created in 20260906090200_inventory_views.sql.
import { supabase } from '@/lib/supabase';

export type StockStatus = 'ok' | 'low' | 'out' | 'short' | 'untracked';
export type MovementReason = 'sale' | 'return' | 'consume' | 'receive' | 'count' | 'adjust' | 'damage' | 'gift';

export interface VariantStockRow {
  variant_id: string;
  product_id: string;
  product_title: string;
  product_handle: string;
  product_status: 'active' | 'draft';
  variant_title: string | null;
  sku: string | null;
  available_for_sale: boolean;
  image_url: string | null;
  on_hand: number | null;
  reserved: number;
  available: number | null;
  threshold: number;
  own_threshold: number | null;
  policy: 'deny' | 'continue' | null;
  low_stock_alerted_at: string | null;
  updated_at: string | null;
  is_tracked: boolean;
  status: StockStatus;
  last_movement_at: string | null;
}

export interface SupplyStockRow {
  supply_id: string;
  name: string;
  sku: string | null;
  on_hand: number;
  consumption_mode: 'per_order' | 'per_item' | 'manual';
  quantity_per_use: number;
  is_active: boolean;
  threshold: number;
  own_threshold: number | null;
  low_stock_alerted_at: string | null;
  updated_at: string | null;
  status: Exclude<StockStatus, 'untracked'>;
  last_movement_at: string | null;
}

export interface KitStockRow {
  bundle_id: string;
  bundle_title: string;
  bundle_handle: string;
  product_status: 'active' | 'draft';
  can_build: number | null;
  limiting_variant_id: string | null;
  limiting_title: string | null;
}

export interface MovementLogRow {
  id: number;
  created_at: string;
  delta: number;
  on_hand_after: number;
  reason: MovementReason;
  order_id: string | null;
  reference: string | null;
  note: string | null;
  variant_id: string | null;
  supply_id: string | null;
  item_kind: 'variant' | 'supply';
  item_title: string;
  sku: string | null;
  order_number: number | null;
  actor_email: string | null;
}

export interface MovementInput {
  variant_id?: string;
  supply_id?: string;
  delta?: number;
  set_to?: number;
  reason: MovementReason;
  order_id?: string;
  reference?: string;
  note?: string;
}

export const INVENTORY_QUERY_KEY = ['admin', 'inventory'] as const;

export const MOVEMENT_REASON_LABELS: Record<MovementReason, string> = {
  sale: 'מכירה',
  return: 'החזרה',
  consume: 'צריכה (אריזה)',
  receive: 'קליטה',
  count: 'ספירה',
  adjust: 'התאמה',
  damage: 'פגום',
  gift: 'מתנה / דוגמה',
};

export const CONSUMPTION_MODE_LABELS: Record<SupplyStockRow['consumption_mode'], string> = {
  per_order: 'לכל הזמנה',
  per_item: 'לכל פריט',
  manual: 'ידני',
};

const STATUS_BADGES: Record<StockStatus, { label: string; className: string }> = {
  ok: { label: 'תקין', className: 'bg-green-500/20 text-green-700' },
  low: { label: 'נמוך', className: 'bg-yellow-500/20 text-yellow-700' },
  out: { label: 'אזל', className: 'bg-destructive/15 text-destructive' },
  short: { label: 'חוסר', className: 'bg-destructive text-destructive-foreground' },
  untracked: { label: 'לא במעקב', className: 'bg-muted text-muted-foreground' },
};

export const stockStatusBadge = (status: StockStatus) => STATUS_BADGES[status] ?? STATUS_BADGES.untracked;

const STATUS_ORDER: Record<StockStatus, number> = { short: 0, out: 1, low: 2, ok: 3, untracked: 4 };

/** Most urgent first, then by title (Hebrew collation). */
export function sortByUrgency<T extends { status: StockStatus }>(rows: T[], title: (row: T) => string): T[] {
  return [...rows].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || title(a).localeCompare(title(b), 'he'),
  );
}

const DEFAULT_VARIANT_TITLES = new Set(['Default Title', 'ברירת מחדל']);

export const variantDisplayTitle = (row: { product_title: string; variant_title: string | null }) =>
  row.variant_title && !DEFAULT_VARIANT_TITLES.has(row.variant_title)
    ? `${row.product_title} · ${row.variant_title}`
    : row.product_title;

/** "+3" / "−2" (typographic minus so RTL text keeps the sign visible). */
export const formatDelta = (delta: number) => (delta > 0 ? `+${delta}` : `−${Math.abs(delta)}`);

const csvCell = (value: string | number | null | undefined) => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function movementsToCsv(rows: MovementLogRow[]): string {
  const header = ['תאריך', 'פריט', 'מק"ט', 'שינוי', 'מלאי אחרי', 'סיבה', 'הזמנה', 'אסמכתא', 'הערה', 'בוצע על ידי'];
  const lines = rows.map((r) =>
    [
      r.created_at, r.item_title, r.sku, r.delta, r.on_hand_after, MOVEMENT_REASON_LABELS[r.reason] ?? r.reason,
      r.order_number, r.reference, r.note, r.actor_email ?? 'מערכת',
    ].map(csvCell).join(','),
  );
  return [header.map(csvCell).join(','), ...lines].join('\n');
}

/** Calls the admin RPC. Resolves to the ids written (empty = nothing changed). Throws a Hebrew Error. */
export async function recordMovements(movements: MovementInput[]): Promise<number[]> {
  const { data, error } = await supabase.rpc('record_inventory_movements', { p_movements: movements });
  if (error) {
    if (error.code === '42501') throw new Error('אין הרשאה לעדכן מלאי');
    if (error.code === 'PGRST202') throw new Error('מיגרציית המלאי עדיין לא הופעלה במסד הנתונים');
    throw new Error(error.message || 'עדכון המלאי נכשל');
  }
  return (data ?? []) as number[];
}
