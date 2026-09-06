import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, History } from 'lucide-react';
import { AdminErrorState } from './AdminErrorState';
import { InventoryAdjustDialog, type AdjustMode, type AdjustTarget } from './InventoryAdjustDialog';
import {
  CONSUMPTION_MODE_LABELS, INVENTORY_QUERY_KEY, sortByUrgency, stockStatusBadge, variantDisplayTitle,
  type KitStockRow, type StockStatus, type SupplyStockRow, type VariantStockRow,
} from './adminInventory';

type Filter = 'all' | 'attention' | 'untracked';
const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'הכל' },
  { value: 'attention', label: 'דורש טיפול' },
  { value: 'untracked', label: 'לא במעקב' },
];
const ATTENTION: StockStatus[] = ['short', 'out', 'low'];

const StatusBadge = ({ status }: { status: StockStatus }) => {
  const { label, className } = stockStatusBadge(status);
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{label}</span>;
};

const formatWhen = (value: string | null) =>
  value ? format(new Date(value), 'dd/MM HH:mm', { locale: he }) : '—';

const Num = ({ value, warn }: { value: number | null | undefined; warn?: boolean }) => (
  <span className={`font-mono tabular-nums ${warn ? 'text-destructive font-bold' : ''}`} dir="ltr">
    {value === null || value === undefined ? '—' : value}
  </span>
);

/** /admin/inventory — the morning screen: products, packaging supplies, and what kits can be built. */
export const InventoryOverview = () => {
  const [filter, setFilter] = useState<Filter>('all');
  const [dialog, setDialog] = useState<{ target: AdjustTarget; mode: AdjustMode } | null>(null);

  const variantsQuery = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'variants'],
    queryFn: async (): Promise<VariantStockRow[]> => {
      const { data, error } = await supabase.from('variant_stock').select('*');
      if (error) throw error;
      return (data ?? []) as VariantStockRow[];
    },
  });
  const suppliesQuery = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'supplies'],
    queryFn: async (): Promise<SupplyStockRow[]> => {
      const { data, error } = await supabase.from('supply_stock').select('*').order('name');
      if (error) throw error;
      return (data ?? []) as SupplyStockRow[];
    },
  });
  const kitsQuery = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'kits'],
    queryFn: async (): Promise<KitStockRow[]> => {
      const { data, error } = await supabase.from('kit_stock').select('*').order('bundle_title');
      if (error) throw error;
      return (data ?? []) as KitStockRow[];
    },
  });

  if (variantsQuery.isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (variantsQuery.isError) {
    const code = (variantsQuery.error as { code?: string })?.code;
    return (
      <AdminErrorState
        error={variantsQuery.error}
        onRetry={() => variantsQuery.refetch()}
        title={code === '42P01' ? 'מסך המלאי דורש את מיגרציית המלאי (20260906090000…)' : 'לא הצלחנו לטעון את המלאי'}
      />
    );
  }

  const variants = sortByUrgency(variantsQuery.data ?? [], (row) => variantDisplayTitle(row)).filter((row) => {
    if (filter === 'attention') return ATTENTION.includes(row.status);
    if (filter === 'untracked') return row.status === 'untracked';
    return true;
  });
  const supplies = sortByUrgency(suppliesQuery.data ?? [], (s) => s.name);
  const kits = kitsQuery.data ?? [];

  const openDialog = (target: AdjustTarget, mode: AdjustMode) => setDialog({ target, mode });
  const variantTarget = (row: VariantStockRow): AdjustTarget => ({
    kind: 'variant', id: row.variant_id, title: variantDisplayTitle(row), onHand: row.on_hand,
  });
  const supplyTarget = (row: SupplyStockRow): AdjustTarget => ({
    kind: 'supply', id: row.supply_id, title: row.name, onHand: row.on_hand,
  });

  const RowActions = ({ target, tracked }: { target: AdjustTarget; tracked: boolean }) =>
    tracked ? (
      <div className="flex gap-1 justify-end">
        <Button size="sm" variant="outline" onClick={() => openDialog(target, 'receive')}>קליטה</Button>
        <Button size="sm" variant="outline" onClick={() => openDialog(target, 'count')}>ספירה</Button>
        <Button size="sm" variant="ghost" onClick={() => openDialog(target, 'adjust')}>התאמה</Button>
      </div>
    ) : (
      <div className="flex justify-end">
        <Button size="sm" onClick={() => openDialog(target, 'count')}>התחלת מעקב</Button>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">מלאי</h1>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to="/admin/inventory/receive">קליטת סחורה</Link></Button>
          <Button variant="outline" asChild>
            <Link to="/admin/inventory/movements"><History className="w-4 h-4 ml-2" />יומן תנועות</Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <Button key={f.value} size="sm" variant={filter === f.value ? 'default' : 'outline'} onClick={() => setFilter(f.value)}>
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">מוצרים</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {variants.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">אין פריטים בסינון הזה</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">מוצר</TableHead>
                  <TableHead className="text-right">מק"ט</TableHead>
                  <TableHead className="text-right">במלאי</TableHead>
                  <TableHead className="text-right">שמור</TableHead>
                  <TableHead className="text-right">זמין</TableHead>
                  <TableHead className="text-right">סף</TableHead>
                  <TableHead className="text-right">מצב</TableHead>
                  <TableHead className="text-right">תנועה אחרונה</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((row) => (
                  <TableRow key={row.variant_id} className={row.status === 'untracked' ? 'text-muted-foreground' : ''}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {row.image_url ? <img src={row.image_url} alt="" className="w-10 h-10 object-cover" /> : <div className="w-10 h-10 bg-muted" />}
                        <div>
                          <Link to={`/admin/products/${row.product_id}`} className="hover:underline">{variantDisplayTitle(row)}</Link>
                          {row.product_status === 'draft' && <span className="text-xs text-muted-foreground mr-2">· טיוטה</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">{row.sku ?? '—'}</TableCell>
                    <TableCell><Num value={row.on_hand} warn={(row.on_hand ?? 0) < 0} /></TableCell>
                    <TableCell><Num value={row.is_tracked ? row.reserved : null} /></TableCell>
                    <TableCell><Num value={row.available} warn={row.is_tracked && (row.available ?? 0) <= 0} /></TableCell>
                    <TableCell><Num value={row.is_tracked ? row.threshold : null} /></TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatWhen(row.last_movement_at)}</TableCell>
                    <TableCell><RowActions target={variantTarget(row)} tracked={row.is_tracked} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">חומרי אריזה</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          {suppliesQuery.isError ? (
            <AdminErrorState error={suppliesQuery.error} onRetry={() => suppliesQuery.refetch()} title="לא הצלחנו לטעון חומרי אריזה" compact />
          ) : supplies.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              עדיין לא הוגדרו חומרי אריזה (קופסאות, נייר, כרטיסים). מוסיפים אותם במסך "חומרי אריזה".
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">פריט</TableHead>
                  <TableHead className="text-right">מק"ט</TableHead>
                  <TableHead className="text-right">במלאי</TableHead>
                  <TableHead className="text-right">סף</TableHead>
                  <TableHead className="text-right">צריכה</TableHead>
                  <TableHead className="text-right">מצב</TableHead>
                  <TableHead className="text-right">תנועה אחרונה</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplies.map((row) => (
                  <TableRow key={row.supply_id} className={row.is_active ? '' : 'text-muted-foreground'}>
                    <TableCell className="font-medium">{row.name}{!row.is_active && <span className="text-xs mr-2">· לא פעיל</span>}</TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">{row.sku ?? '—'}</TableCell>
                    <TableCell><Num value={row.on_hand} warn={row.on_hand <= 0} /></TableCell>
                    <TableCell><Num value={row.threshold} /></TableCell>
                    <TableCell className="text-sm">
                      {CONSUMPTION_MODE_LABELS[row.consumption_mode]}{row.quantity_per_use > 1 ? ` ×${row.quantity_per_use}` : ''}
                    </TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatWhen(row.last_movement_at)}</TableCell>
                    <TableCell><RowActions target={supplyTarget(row)} tracked /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">מארזים — כמה אפשר להרכיב</CardTitle></CardHeader>
        <CardContent>
          {kitsQuery.isError ? (
            <AdminErrorState error={kitsQuery.error} onRetry={() => kitsQuery.refetch()} title="לא הצלחנו לטעון את המארזים" compact />
          ) : kits.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">אין מארזים</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {kits.map((kit) => (
                <div key={kit.bundle_id} className="border border-border p-3">
                  <div className={`text-3xl font-bold font-mono tabular-nums ${kit.can_build === 0 ? 'text-destructive' : ''}`} dir="ltr">
                    {kit.can_build === null ? '∞' : kit.can_build}
                  </div>
                  <Link to={`/admin/bundles/${kit.bundle_id}`} className="font-medium hover:underline">{kit.bundle_title}</Link>
                  <div className="text-xs text-muted-foreground mt-1">
                    {kit.can_build === null ? 'אף רכיב לא במעקב' : `מגביל: ${kit.limiting_title ?? '—'}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <InventoryAdjustDialog
        open={dialog !== null}
        onOpenChange={(open) => { if (!open) setDialog(null); }}
        target={dialog?.target ?? null}
        mode={dialog?.mode ?? 'adjust'}
      />
    </div>
  );
};
