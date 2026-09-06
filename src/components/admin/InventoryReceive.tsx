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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowRight, Loader2, Plus, Trash2 } from 'lucide-react';
import {
  INVENTORY_QUERY_KEY, recordMovements, variantDisplayTitle, type MovementInput, type SupplyStockRow, type VariantStockRow,
} from './adminInventory';

interface ReceiveRow {
  key: number;
  target: string;   // "variant:<id>" | "supply:<id>" | ""
  quantity: string;
  note: string;
}

const emptyRow = (key: number): ReceiveRow => ({ key, target: '', quantity: '', note: '' });

/** One delivery = one batch: several items, one reference (the supplier's invoice / delivery note). */
export const InventoryReceive = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [reference, setReference] = useState(`קליטה ${format(new Date(), 'dd/MM/yyyy')}`);
  const [rows, setRows] = useState<ReceiveRow[]>([emptyRow(1), emptyRow(2), emptyRow(3)]);
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

  const options = useMemo(() => {
    const variants = [...(variantsQuery.data ?? [])]
      .sort((a, b) => variantDisplayTitle(a).localeCompare(variantDisplayTitle(b), 'he'))
      .map((v) => ({ value: `variant:${v.variant_id}`, label: `${variantDisplayTitle(v)}${v.sku ? ` (${v.sku})` : ''}`, onHand: v.on_hand }));
    const supplies = (suppliesQuery.data ?? []).map((s) => ({ value: `supply:${s.supply_id}`, label: `אריזה: ${s.name}${s.sku ? ` (${s.sku})` : ''}`, onHand: s.on_hand }));
    return [...variants, ...supplies];
  }, [variantsQuery.data, suppliesQuery.data]);

  const update = (key: number, patch: Partial<ReceiveRow>) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = () => setRows((prev) => [...prev, emptyRow((prev.at(-1)?.key ?? 0) + 1)]);
  const removeRow = (key: number) => setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));

  const filled = rows.filter((r) => r.target && Number.isInteger(Number(r.quantity)) && Number(r.quantity) > 0);
  const duplicates = new Set(filled.map((r) => r.target)).size !== filled.length;
  const canSubmit = filled.length > 0 && !duplicates && reference.trim() && !saving;

  const submit = async () => {
    if (!canSubmit) return;
    const movements: MovementInput[] = filled.map((r) => {
      const [kind, id] = r.target.split(':');
      return {
        ...(kind === 'variant' ? { variant_id: id } : { supply_id: id }),
        delta: Number(r.quantity),
        reason: 'receive',
        reference: reference.trim(),
        note: r.note.trim() || undefined,
      };
    });
    setSaving(true);
    try {
      const ids = await recordMovements(movements);
      toast.success(`נקלטו ${ids.length} פריטים (${reference.trim()})`);
      await queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      navigate('/admin/inventory');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'הקליטה נכשלה');
    } finally {
      setSaving(false);
    }
  };

  if (variantsQuery.isLoading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/admin/inventory" aria-label="חזרה למלאי"><ArrowRight className="w-5 h-5" /></Link></Button>
        <h1 className="text-2xl font-bold">קליטת סחורה</h1>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">משלוח שהתקבל</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="rcv-ref">אסמכתא (חשבונית / תעודת משלוח / ספק)</Label>
            <Input id="rcv-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>

          <div className="space-y-3">
            {rows.map((row) => {
              const option = options.find((o) => o.value === row.target);
              return (
                <div key={row.key} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-6 space-y-1">
                    <Label className="text-xs">פריט</Label>
                    <Select value={row.target} onValueChange={(v) => update(row.key, { target: v })}>
                      <SelectTrigger><SelectValue placeholder="בחרי פריט" /></SelectTrigger>
                      <SelectContent>
                        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {option && option.onHand != null && (
                      <p className="text-xs text-muted-foreground">במלאי כעת: <span className="font-mono" dir="ltr">{option.onHand}</span></p>
                    )}
                  </div>
                  <div className="col-span-4 sm:col-span-2 space-y-1">
                    <Label className="text-xs">כמות</Label>
                    <Input type="number" min="1" step="1" dir="ltr" value={row.quantity} onChange={(e) => update(row.key, { quantity: e.target.value })} />
                  </div>
                  <div className="col-span-7 sm:col-span-3 space-y-1">
                    <Label className="text-xs">הערה</Label>
                    <Input value={row.note} onChange={(e) => update(row.key, { note: e.target.value })} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button type="button" variant="ghost" size="icon" aria-label="הסרת שורה" onClick={() => removeRow(row.key)}>
                      <Trash2 className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="w-4 h-4 ml-2" />שורה נוספת</Button>
          {duplicates && <p className="text-sm text-destructive">אותו פריט מופיע פעמיים — אחדי את השורות.</p>}
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button onClick={submit} disabled={!canSubmit}>
          {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
          קליטה למלאי ({filled.length})
        </Button>
        <Button variant="outline" asChild><Link to="/admin/inventory">ביטול</Link></Button>
      </div>
    </div>
  );
};
