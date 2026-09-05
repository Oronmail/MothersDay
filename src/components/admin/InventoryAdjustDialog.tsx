import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
  INVENTORY_QUERY_KEY, MOVEMENT_REASON_LABELS, recordMovements, type MovementInput, type MovementReason,
} from './adminInventory';

export type AdjustMode = 'receive' | 'count' | 'adjust';

export interface AdjustTarget {
  kind: 'variant' | 'supply';
  id: string;
  title: string;
  onHand: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: AdjustTarget | null;
  mode: AdjustMode;
  onDone?: () => void;
}

const TITLES: Record<AdjustMode, string> = { receive: 'קליטת סחורה', count: 'ספירת מלאי', adjust: 'התאמת מלאי' };
const ADJUST_REASONS: MovementReason[] = ['adjust', 'damage', 'gift'];

/**
 * One item, one movement. receive = +n with a reference; count = "there are n on the
 * shelf" (the database computes the delta under lock); adjust = ±n with a reason and note.
 */
export const InventoryAdjustDialog = ({ open, onOpenChange, target, mode, onDone }: Props) => {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState('');
  const [direction, setDirection] = useState<'in' | 'out'>('out');
  const [reason, setReason] = useState<MovementReason>('adjust');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuantity(mode === 'count' && target?.onHand != null ? String(target.onHand) : '');
    setDirection('out');
    setReason('adjust');
    setReference(mode === 'count' ? `ספירה ${format(new Date(), 'dd/MM/yyyy')}` : '');
    setNote('');
  }, [open, mode, target]);

  const hasInput = quantity.trim() !== '';
  const qty = Number(quantity);
  const qtyValid = hasInput && Number.isInteger(qty) && (mode === 'count' ? qty >= 0 : qty > 0);
  const noteRequired = mode === 'adjust' && reason === 'adjust';
  const canSubmit = target && qtyValid && (!noteRequired || note.trim().length > 0) && !saving;

  const submit = async () => {
    if (!target || !canSubmit) return;
    const base = target.kind === 'variant' ? { variant_id: target.id } : { supply_id: target.id };
    let movement: MovementInput;
    if (mode === 'receive') movement = { ...base, delta: qty, reason: 'receive', reference: reference || undefined, note: note || undefined };
    else if (mode === 'count') movement = { ...base, set_to: qty, reason: 'count', reference: reference || undefined, note: note || undefined };
    else movement = { ...base, delta: direction === 'in' ? qty : -qty, reason, note: note || undefined };

    setSaving(true);
    try {
      const ids = await recordMovements([movement]);
      if (ids.length === 0) toast.info('אין שינוי — המלאי כבר עומד על הכמות הזו');
      else toast.success(`${TITLES[mode]} נרשמה: ${target.title}`);
      await queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY });
      onDone?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'עדכון המלאי נכשל');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{TITLES[mode]}</DialogTitle>
          <DialogDescription>
            {target?.title}
            {target?.onHand != null && <> · במלאי כעת: <span className="font-mono">{target.onHand}</span></>}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === 'adjust' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>כיוון</Label>
                <Select value={direction} onValueChange={(v) => setDirection(v as 'in' | 'out')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="out">הורדה מהמלאי (−)</SelectItem>
                    <SelectItem value="in">הוספה למלאי (+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>סיבה</Label>
                <Select value={reason} onValueChange={(v) => setReason(v as MovementReason)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ADJUST_REASONS.map((r) => <SelectItem key={r} value={r}>{MOVEMENT_REASON_LABELS[r]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="inv-qty">{mode === 'count' ? 'כמות שנספרה על המדף' : 'כמות'}</Label>
            <Input id="inv-qty" type="number" step="1" min={mode === 'count' ? 0 : 1} value={quantity}
              onChange={(e) => setQuantity(e.target.value)} dir="ltr" autoFocus />
            {mode === 'count' && target?.onHand != null && qtyValid && qty !== target.onHand && (
              <p className="text-xs text-muted-foreground">
                יירשם שינוי של {qty - target.onHand > 0 ? '+' : '−'}{Math.abs(qty - target.onHand)}
              </p>
            )}
          </div>

          {mode !== 'adjust' && (
            <div className="space-y-1">
              <Label htmlFor="inv-ref">{mode === 'receive' ? 'אסמכתא (חשבונית / משלוח)' : 'שם הספירה'}</Label>
              <Input id="inv-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="inv-note">הערה{noteRequired ? ' (חובה בהתאמה)' : ''}</Label>
            <Textarea id="inv-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button onClick={submit} disabled={!canSubmit}>
            {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
            שמירה
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>ביטול</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
