import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { INVENTORY_QUERY_KEY, recordMovements, type MovementInput, type MovementLogRow } from './adminInventory';
import type { AdminOrder } from './adminOrders';

type Condition = 'ok' | 'damaged';
interface Line { variant_id: string; title: string; sold: number; qty: string; condition: Condition }

interface Props {
  order: AdminOrder;
  saleRows: MovementLogRow[];   // this order's `sale` movements
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Manual return for an order that was refunded/cancelled AFTER shipping (spec §4.4):
 * the parcel is back, the admin says what came back and in what condition.
 * תקין → `return` (+qty). פגום → `return` (+qty) then `damage` (−qty): stock unchanged, ledger explains.
 */
export const OrderRestockDialog = ({ order, saleRows, open, onOpenChange }: Props) => {
  const queryClient = useQueryClient();
  const [lines, setLines] = useState<Line[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLines(saleRows.filter((r) => r.variant_id).map((r) => ({
      variant_id: r.variant_id!, title: r.item_title, sold: Math.abs(r.delta), qty: String(Math.abs(r.delta)), condition: 'ok',
    })));
  }, [open, saleRows]);

  const update = (variantId: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.variant_id === variantId ? { ...l, ...patch } : l)));

  const valid = lines.every((l) => Number.isInteger(Number(l.qty)) && Number(l.qty) >= 0 && Number(l.qty) <= l.sold);
  const anyQty = lines.some((l) => Number(l.qty) > 0);

  const submit = async () => {
    const movements: MovementInput[] = [];
    for (const l of lines) {
      const q = Number(l.qty);
      if (q <= 0) continue;
      movements.push({ variant_id: l.variant_id, delta: q, reason: 'return', order_id: order.id, note: `החזרה ידנית להזמנה #${order.order_number ?? ''}` });
      if (l.condition === 'damaged') {
        movements.push({ variant_id: l.variant_id, delta: -q, reason: 'damage', order_id: order.id, note: `חזר פגום מהזמנה #${order.order_number ?? ''}` });
      }
    }
    setSaving(true);
    try {
      const ids = await recordMovements(movements);
      if (ids.length === 0) toast.info('כבר נרשמה החזרה להזמנה הזו — לא נכתב שינוי');
      else toast.success('ההחזרה נרשמה במלאי');
      await queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'רישום ההחזרה נכשל');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>החזרה למלאי — הזמנה #{order.order_number}</DialogTitle>
          <DialogDescription>מה חזר מהחבילה ובאיזה מצב. פריט פגום נרשם כחזר ואז כפגום, כך שהמלאי הזמין לא עולה.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {lines.map((l) => (
            <div key={l.variant_id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-6 text-sm">{l.title}<span className="text-muted-foreground text-xs mr-2">(נמכרו {l.sold})</span></div>
              <Input className="col-span-2" type="number" min="0" max={l.sold} step="1" dir="ltr" value={l.qty} onChange={(e) => update(l.variant_id, { qty: e.target.value })} />
              <div className="col-span-4">
                <Select value={l.condition} onValueChange={(v) => update(l.variant_id, { condition: v as Condition })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ok">תקין — חוזר למכירה</SelectItem>
                    <SelectItem value="damaged">פגום</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={submit} disabled={!valid || !anyQty || saving}>{saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}רישום ההחזרה</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
