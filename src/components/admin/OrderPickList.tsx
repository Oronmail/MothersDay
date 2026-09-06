import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { OrderRestockDialog } from './OrderRestockDialog';
import {
  INVENTORY_QUERY_KEY, stockStatusBadge, variantDisplayTitle, type MovementLogRow, type VariantStockRow,
} from './adminInventory';
import { getLineItems, type AdminOrder } from './adminOrders';

interface KitPart { bundle_id: string; quantity: number | null; variant_id: string | null; product: { id: string; title: string } | { id: string; title: string }[] | null }
interface PickRow { key: string; title: string; qty: number; stock: VariantStockRow | null; indent: boolean }

const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);

/**
 * "רשימת ליקוט": what to pull from the shelf for this order, kits opened into
 * their parts, with the current stock status next to each part. Checkboxes are
 * for the packer's hands only (not saved). Also hosts the manual return for
 * refunded/cancelled orders that had already shipped.
 */
export const OrderPickList = ({ order }: { order: AdminOrder }) => {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [restockOpen, setRestockOpen] = useState(false);
  const lineItems = getLineItems(order);
  const productIds = [...new Set(lineItems.map((i) => i.product_id).filter((id): id is string => Boolean(id)))];

  const kitsQuery = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'order-kits', order.id],
    enabled: productIds.length > 0,
    queryFn: async (): Promise<KitPart[]> => {
      const { data, error } = await supabase.from('bundle_items').select('bundle_id, quantity, variant_id, product:product_id(id, title)').in('bundle_id', productIds);
      if (error) throw error;
      return (data ?? []) as unknown as KitPart[];
    },
  });
  const stockQuery = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'variants'],
    queryFn: async (): Promise<VariantStockRow[]> => {
      const { data, error } = await supabase.from('variant_stock').select('*');
      if (error) { if ((error as { code?: string }).code === '42P01') return []; throw error; }
      return (data ?? []) as VariantStockRow[];
    },
  });
  const movementsQuery = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'order-movements', order.id],
    queryFn: async (): Promise<MovementLogRow[]> => {
      const { data, error } = await supabase.from('inventory_movement_log').select('*').eq('order_id', order.id);
      if (error) { if ((error as { code?: string }).code === '42P01') return []; throw error; }
      return (data ?? []) as MovementLogRow[];
    },
  });

  const stockByVariant = new Map((stockQuery.data ?? []).map((r) => [r.variant_id, r]));
  const stockByProduct = new Map<string, VariantStockRow>();
  for (const r of stockQuery.data ?? []) if (!stockByProduct.has(r.product_id)) stockByProduct.set(r.product_id, r);
  const partsByKit = new Map<string, KitPart[]>();
  for (const p of kitsQuery.data ?? []) partsByKit.set(p.bundle_id, [...(partsByKit.get(p.bundle_id) ?? []), p]);

  const rows: PickRow[] = [];
  lineItems.forEach((item, i) => {
    const qty = item.quantity ?? 1;
    const parts = item.product_id ? partsByKit.get(item.product_id) : undefined;
    if (parts?.length) {
      rows.push({ key: `l${i}`, title: item.title ?? 'מארז', qty, stock: null, indent: false });
      parts.forEach((p, j) => {
        const product = one(p.product);
        const stock = (p.variant_id ? stockByVariant.get(p.variant_id) : null) ?? (product ? stockByProduct.get(product.id) : null) ?? null;
        rows.push({ key: `l${i}p${j}`, title: product?.title ?? 'רכיב', qty: (p.quantity ?? 1) * qty, stock, indent: true });
      });
    } else {
      const stock = (item.variant_id ? stockByVariant.get(item.variant_id) : null) ?? null;
      rows.push({ key: `l${i}`, title: stock ? variantDisplayTitle(stock) : (item.title ?? 'פריט'), qty, stock, indent: false });
    }
  });

  // Stable reference: OrderRestockDialog resets its editable form off this array
  // ([open, saleRows] effect deps) — a fresh array on every render would wipe
  // in-progress edits mid-typing.
  const saleRows = useMemo(
    () => (movementsQuery.data ?? []).filter((m) => m.reason === 'sale'),
    [movementsQuery.data],
  );
  const returnRows = (movementsQuery.data ?? []).filter((m) => m.reason === 'return');
  const hasReturn = returnRows.length > 0;
  const soldTotal = saleRows.reduce((sum, m) => sum + Math.abs(m.delta), 0);
  const returnedTotal = returnRows.reduce((sum, m) => sum + m.delta, 0);
  const shippedAndUndone =
    ['cancelled', 'refunded'].includes(order.financial_status ?? '') &&
    ['shipped', 'delivered'].includes(order.fulfillment_status ?? '');
  const paidAfterReturn = hasReturn && order.financial_status === 'paid';
  const partialReturn = hasReturn && !paidAfterReturn && returnedTotal < soldTotal;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>רשימת ליקוט</CardTitle>
        {shippedAndUndone && saleRows.length > 0 && !hasReturn && (
          <Button size="sm" variant="outline" onClick={() => setRestockOpen(true)}>החזרה למלאי</Button>
        )}
      </CardHeader>
      <CardContent>
        {paidAfterReturn && (
          <p className="text-sm text-destructive mb-3">
            ההזמנה שולמה שוב אחרי החזרה למלאי — המלאי לא הופחת בשנית; יש לתקן ידנית דרך &quot;התאמה&quot; במסך המלאי.
          </p>
        )}
        {rows.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">אין פריטים</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {rows.map((r) => {
              const badge = r.stock && r.stock.is_tracked && r.stock.status !== 'ok' ? stockStatusBadge(r.stock.status) : null;
              return (
                <li key={r.key} className={`flex items-center gap-3 py-2 ${r.indent ? 'pr-7 text-sm text-muted-foreground' : 'font-medium'}`}>
                  <Checkbox checked={!!checked[r.key]} onCheckedChange={(c) => setChecked((prev) => ({ ...prev, [r.key]: c === true }))} aria-label={`נלקט: ${r.title}`} />
                  <span className={`flex-1 ${checked[r.key] ? 'line-through opacity-60' : ''}`}>{r.indent ? '└ ' : ''}{r.title}</span>
                  {badge && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>
                      {badge.label}{r.stock?.on_hand != null ? ` · במלאי ${r.stock.on_hand}` : ''}
                    </span>
                  )}
                  <span className="font-mono tabular-nums" dir="ltr">×{r.qty}</span>
                </li>
              );
            })}
          </ul>
        )}
        {partialReturn && (
          <p className="text-xs text-muted-foreground mt-3">
            נרשמה החזרה חלקית ({returnedTotal} מתוך {soldTotal}) — יתרת הפריטים מתוקנת דרך &quot;התאמה&quot; במסך המלאי.
          </p>
        )}
        {hasReturn && !paidAfterReturn && !partialReturn && (
          <p className="text-xs text-muted-foreground mt-3">נרשמה החזרה למלאי עבור ההזמנה הזו (ראי יומן תנועות).</p>
        )}
        {shippedAndUndone && saleRows.length === 0 && (
          <p className="text-xs text-muted-foreground mt-3">להזמנה הזו אין תנועות מכירה (הפריטים לא היו במעקב) — אין מה להחזיר.</p>
        )}
      </CardContent>
      <OrderRestockDialog order={order} saleRows={saleRows} open={restockOpen} onOpenChange={setRestockOpen} />
    </Card>
  );
};
