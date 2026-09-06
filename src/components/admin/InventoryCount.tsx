import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ArrowRight, Loader2 } from 'lucide-react';
import {
  INVENTORY_QUERY_KEY, formatDelta, recordMovements, variantDisplayTitle,
  type MovementInput, type SupplyStockRow, type VariantStockRow,
} from './adminInventory';

interface CountLine {
  key: string;            // "variant:<id>" | "supply:<id>"
  title: string;
  sku: string | null;
  onHand: number | null;  // null = untracked
}

/**
 * Full count. Every tracked item is pre-filled with the system number; the admin
 * types what is on the shelf. Untracked items may be included to start tracking
 * many at once (Eden's first count). Only rows that differ are written.
 */
export const InventoryCount = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [includeUntracked, setIncludeUntracked] = useState(true);
  const [reference, setReference] = useState(`ספירה ${format(new Date(), 'dd/MM/yyyy')}`);
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const variantsQuery = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'variants'],
    queryFn: async (): Promise<VariantStockRow[]> => {
      const { data, error } = await supabase.from('variant_stock').select('*');
      if (error) throw error;
      return (data ?? []) as VariantStockRow[];
    },
  });
  const suppliesQuery = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'supplies', 'active'],
    queryFn: async (): Promise<SupplyStockRow[]> => {
      const { data, error } = await supabase.from('supply_stock').select('*').eq('is_active', true).order('name');
      if (error) throw error;
      return (data ?? []) as SupplyStockRow[];
    },
  });

  const lines: CountLine[] = useMemo(() => {
    const variants = (variantsQuery.data ?? [])
      .filter((v) => v.product_status === 'active' || v.is_tracked)
      .filter((v) => includeUntracked || v.is_tracked)
      .map((v) => ({ key: `variant:${v.variant_id}`, title: variantDisplayTitle(v), sku: v.sku, onHand: v.on_hand }))
      .sort((a, b) => a.title.localeCompare(b.title, 'he'));
    const supplies = (suppliesQuery.data ?? []).map((s) => ({ key: `supply:${s.supply_id}`, title: `אריזה: ${s.name}`, sku: s.sku, onHand: s.on_hand }));
    return [...variants, ...supplies];
  }, [variantsQuery.data, suppliesQuery.data, includeUntracked]);

  const valueFor = (line: CountLine) => counted[line.key] ?? (line.onHand === null ? '' : String(line.onHand));

  const changes = lines
    .map((line) => {
      const raw = valueFor(line).trim();
      if (raw === '') return null;
      const value = Number(raw);
      if (!Number.isInteger(value) || value < 0) return null;
      if (line.onHand !== null && value === line.onHand) return null;
      return { line, value, delta: value - (line.onHand ?? 0), starts: line.onHand === null };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const submit = async () => {
    const movements: MovementInput[] = changes.map((c) => {
      const [kind, id] = c.line.key.split(':');
      return { ...(kind === 'variant' ? { variant_id: id } : { supply_id: id }), set_to: c.value, reason: 'count', reference: reference.trim() };
    });
    setSaving(true);
    try {
      const ids = await recordMovements(movements);
      const startedAtZero = changes.filter((c) => c.starts && c.value === 0).length;
      const parts = [`${ids.length} פריטים עודכנו`];
      if (startedAtZero > 0) parts.push(`${startedAtZero} התחילו מעקב ב־0`);
      toast.success(`הספירה נשמרה: ${parts.join(', ')}`);
      await queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      navigate('/admin/inventory');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'שמירת הספירה נכשלה');
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  if (variantsQuery.isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/admin/inventory" aria-label="חזרה למלאי"><ArrowRight className="w-5 h-5" /></Link></Button>
          <h1 className="text-2xl font-bold">ספירת מלאי</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Switch id="cnt-untracked" checked={includeUntracked} onCheckedChange={setIncludeUntracked} />
          <Label htmlFor="cnt-untracked">לכלול פריטים שעדיין לא במעקב</Label>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">מה יש על המדף</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1 max-w-sm">
            <Label htmlFor="cnt-ref">שם הספירה</Label>
            <Input id="cnt-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">פריט</TableHead>
                <TableHead className="text-right">מק"ט</TableHead>
                <TableHead className="text-right">במערכת</TableHead>
                <TableHead className="text-right">נספר</TableHead>
                <TableHead className="text-right">שינוי</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line) => {
                const raw = valueFor(line);
                const value = raw.trim() === '' ? null : Number(raw);
                const delta = value === null || !Number.isInteger(value) ? null : value - (line.onHand ?? 0);
                return (
                  <TableRow key={line.key} className={line.onHand === null ? 'text-muted-foreground' : ''}>
                    <TableCell className="font-medium">{line.title}{line.onHand === null && <span className="text-xs mr-2">· לא במעקב</span>}</TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">{line.sku ?? '—'}</TableCell>
                    <TableCell className="font-mono tabular-nums" dir="ltr">{line.onHand ?? '—'}</TableCell>
                    <TableCell className="w-32">
                      <Input type="number" min="0" step="1" dir="ltr" value={raw} placeholder={line.onHand === null ? 'ריק = לא נספר' : ''}
                        onChange={(e) => setCounted((prev) => ({ ...prev, [line.key]: e.target.value }))} />
                    </TableCell>
                    <TableCell className={`font-mono tabular-nums ${delta && delta !== 0 ? (delta < 0 ? 'text-destructive' : 'text-green-700') : 'text-muted-foreground'}`} dir="ltr">
                      {delta === null || (delta === 0 && line.onHand !== null) ? '—' : line.onHand === null ? `התחלה: ${value}` : formatDelta(delta)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={() => setConfirmOpen(true)} disabled={changes.length === 0 || !reference.trim() || saving}>
          בדיקת הבדלים ושמירה ({changes.length})
        </Button>
        <Button variant="outline" asChild><Link to="/admin/inventory">ביטול</Link></Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>לאשר את הספירה?</AlertDialogTitle>
            <AlertDialogDescription>רק השורות שהשתנו ייכתבו ליומן, תחת "{reference.trim()}". פריט שמתחיל מעקב ב־0 נרשם ברמת המלאי בלי שורת יומן.</AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="max-h-72 overflow-auto text-sm space-y-1">
            {changes.map((c) => (
              <li key={c.line.key} className="flex justify-between gap-3 border-b border-border/50 py-1">
                <span>{c.line.title}</span>
                <span className="font-mono tabular-nums" dir="ltr">
                  {c.starts ? `→ ${c.value} (התחלת מעקב)` : `${c.line.onHand} → ${c.value} (${formatDelta(c.delta)})`}
                </span>
              </li>
            ))}
          </ul>
          <AlertDialogFooter className="gap-2 sm:justify-start">
            <AlertDialogAction onClick={(e) => { e.preventDefault(); submit(); }} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}שמירת הספירה
            </AlertDialogAction>
            <AlertDialogCancel disabled={saving}>חזרה</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
