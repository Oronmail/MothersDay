import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowRight, Loader2, Pencil, Plus } from 'lucide-react';
import { AdminErrorState } from './AdminErrorState';
import { InventoryAdjustDialog, type AdjustMode, type AdjustTarget } from './InventoryAdjustDialog';
import {
  CONSUMPTION_MODE_LABELS, INVENTORY_QUERY_KEY, stockStatusBadge, type SupplyStockRow,
} from './adminInventory';

const EMPTY_FORM = {
  name: '',
  sku: '',
  consumption_mode: 'per_order' as SupplyStockRow['consumption_mode'],
  quantity_per_use: '1',
  low_stock_threshold: '',
  is_active: true,
};

/** Boxes, tissue, cards: not sold, consumed when an order ships. Quantities move via the ledger dialog. */
export const InventorySupplies = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [stockDialog, setStockDialog] = useState<{ target: AdjustTarget; mode: AdjustMode } | null>(null);

  const query = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'supplies'],
    queryFn: async (): Promise<SupplyStockRow[]> => {
      const { data, error } = await supabase.from('supply_stock').select('*').order('name');
      if (error) throw error;
      return (data ?? []) as SupplyStockRow[];
    },
  });

  const openNew = () => { setEditingId(null); setForm({ ...EMPTY_FORM }); setDialogOpen(true); };
  const openEdit = (s: SupplyStockRow) => {
    setEditingId(s.supply_id);
    setForm({
      name: s.name, sku: s.sku ?? '', consumption_mode: s.consumption_mode,
      quantity_per_use: String(s.quantity_per_use), low_stock_threshold: s.own_threshold == null ? '' : String(s.own_threshold),
      is_active: s.is_active,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    const qpu = Number(form.quantity_per_use);
    if (!form.name.trim()) { toast.error('חסר שם'); return; }
    if (!Number.isInteger(qpu) || qpu < 1) { toast.error('כמות לשימוש חייבת להיות מספר שלם חיובי'); return; }
    const rawThreshold = form.low_stock_threshold.trim();
    const threshold = rawThreshold === '' ? null : Number(rawThreshold);
    if (threshold !== null && !(Number.isInteger(threshold) && threshold >= 0)) {
      toast.error('סף ההתראה חייב להיות מספר שלם (או ריק)');
      return;
    }
    const row = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      consumption_mode: form.consumption_mode,
      quantity_per_use: qpu,
      low_stock_threshold: threshold,
      is_active: form.is_active,
    };
    setSaving(true);
    try {
      const { error } = editingId
        ? await supabase.from('packaging_supplies').update(row).eq('id', editingId)
        : await supabase.from('packaging_supplies').insert(row);
      if (error) throw error;
      toast.success(editingId ? 'חומר האריזה עודכן' : 'חומר האריזה נוסף — עכשיו אפשר לספור אותו');
      await queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      setDialogOpen(false);
    } catch (error) {
      // sku is UNIQUE in packaging_supplies — say which field collided, not "23505".
      const code = (error as { code?: string } | null)?.code;
      toast.error(code === '23505'
        ? 'המק"ט כבר קיים בחומר אריזה אחר'
        : `השמירה נכשלה: ${error instanceof Error ? error.message : ''}`);
    } finally {
      setSaving(false);
    }
  };

  const supplies = query.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/admin/inventory" aria-label="חזרה למלאי"><ArrowRight className="w-5 h-5" /></Link></Button>
          <h1 className="text-2xl font-bold">חומרי אריזה</h1>
        </div>
        <Button onClick={openNew}><Plus className="w-4 h-4 ml-2" />חומר אריזה חדש</Button>
      </div>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          {query.isLoading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : query.isError ? (
            <AdminErrorState error={query.error} onRetry={() => query.refetch()} title="לא הצלחנו לטעון חומרי אריזה" />
          ) : supplies.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              אין עדיין חומרי אריזה. הוסיפי קופסה, נייר עטיפה, כרטיס ברכה — כל דבר שנצרך כשאורזים הזמנה.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">מק"ט</TableHead>
                  <TableHead className="text-right">במלאי</TableHead>
                  <TableHead className="text-right">סף</TableHead>
                  <TableHead className="text-right">צריכה</TableHead>
                  <TableHead className="text-right">מצב</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {supplies.map((s) => {
                  const badge = stockStatusBadge(s.status);
                  const target: AdjustTarget = { kind: 'supply', id: s.supply_id, title: s.name, onHand: s.on_hand };
                  return (
                    <TableRow key={s.supply_id} className={s.is_active ? '' : 'text-muted-foreground'}>
                      <TableCell className="font-medium">{s.name}{!s.is_active && <span className="text-xs mr-2">· לא פעיל</span>}</TableCell>
                      <TableCell className="font-mono text-xs" dir="ltr">{s.sku ?? '—'}</TableCell>
                      <TableCell className={`font-mono tabular-nums ${s.on_hand <= 0 ? 'text-destructive font-bold' : ''}`} dir="ltr">{s.on_hand}</TableCell>
                      <TableCell className="font-mono tabular-nums" dir="ltr">{s.threshold}</TableCell>
                      <TableCell className="text-sm">{CONSUMPTION_MODE_LABELS[s.consumption_mode]}{s.quantity_per_use > 1 ? ` ×${s.quantity_per_use}` : ''}</TableCell>
                      <TableCell><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}>{badge.label}</span></TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button size="sm" variant="outline" onClick={() => setStockDialog({ target, mode: 'receive' })}>קליטה</Button>
                          <Button size="sm" variant="outline" onClick={() => setStockDialog({ target, mode: 'count' })}>ספירה</Button>
                          <Button size="sm" variant="ghost" onClick={() => setStockDialog({ target, mode: 'adjust' })}>התאמה</Button>
                          <Button size="sm" variant="ghost" onClick={() => openEdit(s)} aria-label="עריכה"><Pencil className="w-4 h-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingId ? 'עריכת חומר אריזה' : 'חומר אריזה חדש'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="sup-name">שם</Label>
              <Input id="sup-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="למשל: קופסת משלוח בינונית" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="sup-sku">מק"ט</Label>
                <Input id="sup-sku" dir="ltr" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="BOX-M" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sup-thr">סף התראה (ריק = ברירת מחדל)</Label>
                <Input id="sup-thr" type="number" min="0" step="1" dir="ltr" value={form.low_stock_threshold} onChange={(e) => setForm({ ...form, low_stock_threshold: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>צריכה</Label>
                <Select value={form.consumption_mode} onValueChange={(v) => setForm({ ...form, consumption_mode: v as SupplyStockRow['consumption_mode'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_order">לכל הזמנה שנשלחת</SelectItem>
                    <SelectItem value="per_item">לכל יחידה שנשלחת (רכיבי מארז נספרים בנפרד)</SelectItem>
                    <SelectItem value="manual">ידני בלבד</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="sup-qpu">כמות לכל שימוש</Label>
                <Input id="sup-qpu" type="number" min="1" step="1" dir="ltr" value={form.quantity_per_use} onChange={(e) => setForm({ ...form, quantity_per_use: e.target.value })} disabled={form.consumption_mode === 'manual'} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="sup-active" checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} />
              <Label htmlFor="sup-active">{form.is_active ? 'פעיל — נצרך אוטומטית במשלוח' : 'לא פעיל'}</Label>
            </div>
            <p className="text-xs text-muted-foreground">הכמות במלאי נקבעת בספירה/קליטה (ביומן), לא כאן.</p>
          </div>
          <DialogFooter className="gap-2 sm:justify-start">
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}שמירה</Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>ביטול</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InventoryAdjustDialog
        open={stockDialog !== null}
        onOpenChange={(open) => { if (!open) setStockDialog(null); }}
        target={stockDialog?.target ?? null}
        mode={stockDialog?.mode ?? 'count'}
      />
    </div>
  );
};
