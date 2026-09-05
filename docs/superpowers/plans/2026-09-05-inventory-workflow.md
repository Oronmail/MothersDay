# Inventory Workflow (Phase 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the office its daily workflow on top of the Phase 1 ledger: receiving, counting, packaging supplies, a pick list and manual returns on the order card, a low-stock dashboard card, settings, the packing queue, and shipping that marks itself shipped and consumes supplies.

**Architecture:** No new tables. Every screen writes through `record_inventory_movements` (Task 2 of the core plan) or updates admin-editable metadata under RLS, and reads the staff views. The HFD handler sets `fulfillment_status = 'shipped'`, which fires the `orders_supplies` trigger; it then emails the owners about supplies that dipped.

**Tech Stack:** React 18 + TanStack Query + shadcn/ui, Vercel Node functions, Resend REST, Vitest (from the core plan).

**Spec:** `docs/superpowers/specs/2026-09-05-inventory-management-design.md` — sections 4.5, 5, 7.2, 7.3, 7.5, 7.7, 7.8.

**Prerequisite:** all 14 tasks of `docs/superpowers/plans/2026-09-05-inventory-core.md` are done and pushed.

## Global Constraints

Same as the core plan: Hebrew UI copy; no secrets in git; stock changes only through `record_inventory_movements` / `inv_apply()`; no new Vercel functions; SQL tests rolled back; `npx tsc --noEmit -p tsconfig.app.json | grep <file>` and `npx eslint <files>` must be clean for touched files; commit per task on `launch/payplus` with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/admin/InventoryReceive.tsx` | Create | `/admin/inventory/receive` — multi-row receiving batch |
| `src/components/admin/InventoryCount.tsx` | Create | `/admin/inventory/count` — full count with a diff confirmation; can start tracking many items at once |
| `src/components/admin/InventorySupplies.tsx` | Create | `/admin/inventory/supplies` — packaging supplies CRUD |
| `src/components/admin/OrderPickList.tsx` | Create | Order card: what to pull, kits exploded, stock warnings |
| `src/components/admin/OrderRestockDialog.tsx` | Create | Order card: manual return for shipped orders that were cancelled/refunded |
| `src/components/admin/OrderDetail.tsx` | Modify | Mount the pick list and the restock button |
| `src/components/admin/OrderList.tsx` | Modify | לאריזה quick filter |
| `src/components/admin/Dashboard.tsx` | Modify | מלאי נמוך card |
| `src/components/admin/StoreSettings.tsx`, `src/hooks/useStoreSettings.ts` | Modify | Default threshold + reservation switch |
| `src/components/admin/InventoryOverview.tsx`, `src/pages/AdminDashboard.tsx` | Modify | Header links + routes for the three new screens |
| `api/_lib/lowStockEmail.ts` (+ `.test.ts`) | Create | Standalone low-stock email (supplies after shipping) |
| `api/hfd-shipment.ts` | Modify | Create → `shipped`; cancel → back to `unfulfilled`; supplies low-stock email |
| `api/payplus-callback.ts` | Modify | Declined charge releases its reservation after 15 minutes |
| `CLAUDE.md` | Modify | Phase 2 notes |

---

### Task 1: קליטת סחורה — `/admin/inventory/receive`

**Files:**
- Create: `src/components/admin/InventoryReceive.tsx`
- Modify: `src/pages/AdminDashboard.tsx` (route `inventory/receive`)
- Modify: `src/components/admin/InventoryOverview.tsx` (header button)

**Interfaces:**
- Consumes: `variant_stock`, `supply_stock`, `recordMovements`, `variantDisplayTitle`, `INVENTORY_QUERY_KEY` (core Task 10).

- [ ] **Step 1: Write the component**

```tsx
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
    queryKey: [...INVENTORY_QUERY_KEY, 'supplies'],
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
```

- [ ] **Step 2: Route and header button**

`src/pages/AdminDashboard.tsx`: import `InventoryReceive` and add `<Route path="inventory/receive" element={<InventoryReceive />} />`.
`InventoryOverview.tsx` header `div.flex.flex-wrap.gap-2`: add before the movements button
```tsx
          <Button asChild><Link to="/admin/inventory/receive">קליטת סחורה</Link></Button>
```

- [ ] **Step 3: Verify, commit**

Run: `npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "InventoryReceive|InventoryOverview|AdminDashboard"; npx eslint src/components/admin/InventoryReceive.tsx src/components/admin/InventoryOverview.tsx src/pages/AdminDashboard.tsx`
Manual: receive 2 rows → toast, redirected to the overview with updated numbers; the movements log shows two `קליטה` rows sharing the reference.

```bash
git add src/components/admin/InventoryReceive.tsx src/components/admin/InventoryOverview.tsx src/pages/AdminDashboard.tsx
git commit -m "Admin inventory: receiving screen (batch with one reference)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: ספירת מלאי — `/admin/inventory/count`

**Files:**
- Create: `src/components/admin/InventoryCount.tsx`
- Modify: `src/pages/AdminDashboard.tsx`, `src/components/admin/InventoryOverview.tsx` (route + header button)

**Interfaces:**
- Consumes: as Task 1. Movements use `set_to` (`count`); the database computes the delta under lock.

- [ ] **Step 1: Write the component**

```tsx
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
    queryKey: [...INVENTORY_QUERY_KEY, 'supplies'],
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
      toast.success(`הספירה נשמרה: ${ids.length} פריטים עודכנו`);
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
            <AlertDialogDescription>רק השורות שהשתנו ייכתבו ליומן, תחת "{reference.trim()}".</AlertDialogDescription>
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
```

- [ ] **Step 2: Route and header button**

Add `<Route path="inventory/count" element={<InventoryCount />} />` and, in the overview header, `<Button variant="outline" asChild><Link to="/admin/inventory/count">ספירת מלאי</Link></Button>`.

- [ ] **Step 3: Verify, commit**

Run the tsc/eslint pair for `InventoryCount.tsx` and the two modified files. Manual: change two numbers and leave one blank untracked row → the confirm dialog lists exactly two changes; save → the overview reflects them; a second count with identical numbers shows "(0)" and the button is disabled.

```bash
git add src/components/admin/InventoryCount.tsx src/components/admin/InventoryOverview.tsx src/pages/AdminDashboard.tsx
git commit -m "Admin inventory: stock count screen with diff confirmation

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: חומרי אריזה — `/admin/inventory/supplies`

**Files:**
- Create: `src/components/admin/InventorySupplies.tsx`
- Modify: `src/pages/AdminDashboard.tsx`, `src/components/admin/InventoryOverview.tsx` (route + header button)

**Interfaces:**
- Consumes: table `packaging_supplies` (admin insert/update/delete under RLS; `on_hand` guarded), view `supply_stock`, `InventoryAdjustDialog`, `CONSUMPTION_MODE_LABELS`, `stockStatusBadge`.

- [ ] **Step 1: Write the component**

```tsx
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
    queryKey: [...INVENTORY_QUERY_KEY, 'supplies-all'],
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
    const row = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      consumption_mode: form.consumption_mode,
      quantity_per_use: qpu,
      low_stock_threshold: form.low_stock_threshold.trim() === '' ? null : Number(form.low_stock_threshold),
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
      toast.error(`השמירה נכשלה: ${error instanceof Error ? error.message : ''}`);
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
                    <SelectItem value="per_item">לכל פריט שנשלח</SelectItem>
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
```

- [ ] **Step 2: Route and header button**

Add `<Route path="inventory/supplies" element={<InventorySupplies />} />` and the overview header button `<Button variant="outline" asChild><Link to="/admin/inventory/supplies">חומרי אריזה</Link></Button>`. In the overview's empty-supplies message, wrap "חומרי אריזה" in `<Link to="/admin/inventory/supplies" className="underline">`.

- [ ] **Step 3: Verify, commit**

tsc/eslint pair for the three files. Manual: add "קופסת משלוח" (per_order), "כרטיס ברכה" (per_item), count each → they appear in the overview's supplies card; ship a paid test order from the order card (Task 8 makes this automatic; before that, change the fulfillment select to נשלח) → both supplies decrease and `צריכה (אריזה)` rows appear in the log.

```bash
git add src/components/admin/InventorySupplies.tsx src/components/admin/InventoryOverview.tsx src/pages/AdminDashboard.tsx
git commit -m "Admin inventory: packaging supplies screen

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Order card — pick list and manual return

**Files:**
- Create: `src/components/admin/OrderPickList.tsx`
- Create: `src/components/admin/OrderRestockDialog.tsx`
- Modify: `src/components/admin/OrderDetail.tsx` (import + one JSX line after the "פריטים" card)

**Interfaces:**
- Consumes: `AdminOrder`, `getLineItems` (`adminOrders.ts`); `bundle_items`, `variant_stock`, `inventory_movement_log`; `recordMovements`, `stockStatusBadge`, `variantDisplayTitle`, `INVENTORY_QUERY_KEY`.
- Produces: `<OrderPickList order={order} />` (includes the return button + dialog); `<OrderRestockDialog order open onOpenChange saleRows />`.

- [ ] **Step 1: `OrderRestockDialog.tsx`**

```tsx
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
```

- [ ] **Step 2: `OrderPickList.tsx`**

```tsx
import { useState } from 'react';
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
    queryKey: [...INVENTORY_QUERY_KEY, 'order-stock', order.id],
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

  const saleRows = (movementsQuery.data ?? []).filter((m) => m.reason === 'sale');
  const hasReturn = (movementsQuery.data ?? []).some((m) => m.reason === 'return');
  const shippedAndUndone =
    ['cancelled', 'refunded'].includes(order.financial_status ?? '') &&
    ['shipped', 'delivered'].includes(order.fulfillment_status ?? '');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>רשימת ליקוט</CardTitle>
        {shippedAndUndone && saleRows.length > 0 && !hasReturn && (
          <Button size="sm" variant="outline" onClick={() => setRestockOpen(true)}>החזרה למלאי</Button>
        )}
      </CardHeader>
      <CardContent>
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
        {hasReturn && <p className="text-xs text-muted-foreground mt-3">נרשמה החזרה למלאי עבור ההזמנה הזו (ראי יומן תנועות).</p>}
        {shippedAndUndone && saleRows.length === 0 && (
          <p className="text-xs text-muted-foreground mt-3">להזמנה הזו אין תנועות מכירה (הפריטים לא היו במעקב) — אין מה להחזיר.</p>
        )}
      </CardContent>
      <OrderRestockDialog order={order} saleRows={saleRows} open={restockOpen} onOpenChange={setRestockOpen} />
    </Card>
  );
};
```

- [ ] **Step 3: Mount in `OrderDetail.tsx`**

Add `import { OrderPickList } from './OrderPickList';` and, right after the closing `</Card>` of the "פריטים" card (before `{/* Shipping Address */}`), add `<OrderPickList order={order} />`.

- [ ] **Step 4: Verify, commit**

tsc/eslint pair for the three files. Manual: open a paid test order containing a kit → the pick list shows the kit line with its parts indented, quantities multiplied by the line quantity, and a חוסר/נמוך chip where stock is short. Mark an order shipped, then set its status to הוחזר → the "החזרה למלאי" button appears; register 1 תקין + 1 פגום → the log shows `החזרה` +1, `החזרה` +1, `פגום` −1; the button disappears.

```bash
git add src/components/admin/OrderPickList.tsx src/components/admin/OrderRestockDialog.tsx src/components/admin/OrderDetail.tsx
git commit -m "Admin order card: pick list with kits exploded, manual return after shipping

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Orders list — לאריזה queue

**Files:**
- Modify: `src/components/admin/OrderList.tsx` (filters block, ~lines 30-50 and the filter UI in the JSX)

- [ ] **Step 1: Add the quick filter**

Add `import { Button } from '@/components/ui/button';` and `import { PackageCheck } from 'lucide-react';` (extend the existing lucide import). Below the two `useState` filters add:

```ts
  const isPackingQueue = financialFilter === 'paid' && fulfillmentFilter === 'unfulfilled';
  const togglePackingQueue = () => {
    if (isPackingQueue) { setFinancialFilter('all'); setFulfillmentFilter('all'); }
    else { setFinancialFilter('paid'); setFulfillmentFilter('unfulfilled'); }
  };
  const packingCount = orders?.filter((o) => o.financial_status === 'paid' && o.fulfillment_status === 'unfulfilled').length ?? 0;
```

Next to the two `Select` filters in the JSX add:

```tsx
            <Button variant={isPackingQueue ? 'default' : 'outline'} size="sm" onClick={togglePackingQueue}>
              <PackageCheck className="w-4 h-4 ml-2" />לאריזה ({packingCount})
            </Button>
```

- [ ] **Step 2: Verify, commit**

tsc/eslint for `OrderList.tsx`. Manual: the button shows the count of paid + unfulfilled orders and toggles both selects.

```bash
git add src/components/admin/OrderList.tsx
git commit -m "Admin orders: לאריזה quick filter (paid, unfulfilled)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Dashboard — מלאי נמוך card

**Files:**
- Modify: `src/components/admin/Dashboard.tsx` (new query + a card after the stats grid)

- [ ] **Step 1: Query and card**

Add imports: `import { Link } from 'react-router-dom';`, `AlertTriangle` to the lucide import, and
`import { INVENTORY_QUERY_KEY, sortByUrgency, stockStatusBadge, variantDisplayTitle, type KitStockRow, type SupplyStockRow, type VariantStockRow } from './adminInventory';`

Add after `topProductsQuery`:

```ts
  // Low stock (spec §7.8): products + supplies at/under threshold, kits that cannot be built.
  const lowStockQuery = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'dashboard'],
    queryFn: async () => {
      const [variants, supplies, kits] = await Promise.all([
        supabase.from('variant_stock').select('*').in('status', ['short', 'out', 'low']),
        supabase.from('supply_stock').select('*').in('status', ['short', 'out', 'low']),
        supabase.from('kit_stock').select('*').eq('can_build', 0),
      ]);
      const missing = [variants.error, supplies.error, kits.error].find((e) => e?.code === '42P01');
      if (missing) return null; // inventory migration not applied yet
      const err = variants.error ?? supplies.error ?? kits.error;
      if (err) throw err;
      const items = sortByUrgency(
        [
          ...((variants.data ?? []) as VariantStockRow[]).map((v) => ({ key: v.variant_id, title: variantDisplayTitle(v), available: v.available ?? 0, threshold: v.threshold, status: v.status })),
          ...((supplies.data ?? []) as SupplyStockRow[]).map((s) => ({ key: s.supply_id, title: `אריזה: ${s.name}`, available: s.on_hand, threshold: s.threshold, status: s.status })),
        ],
        (i) => i.title,
      );
      return { items, blockedKits: (kits.data ?? []) as KitStockRow[] };
    },
  });
```

After the stats grid (the `</div>` closing `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`), add:

```tsx
      {lowStockQuery.data && (lowStockQuery.data.items.length > 0 || lowStockQuery.data.blockedKits.length > 0) && (
        <Card className="border-destructive/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-destructive" />מלאי נמוך</CardTitle>
            <Link to="/admin/inventory" className="text-sm underline">למסך המלאי</Link>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {lowStockQuery.data.items.slice(0, 6).map((i) => (
                <div key={i.key} className="flex items-center justify-between text-sm border border-border/60 px-3 py-2">
                  <span className="truncate">{i.title}</span>
                  <span className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono tabular-nums text-muted-foreground" dir="ltr">{i.available} / סף {i.threshold}</span>
                    <StatusBadge {...stockStatusBadge(i.status)} />
                  </span>
                </div>
              ))}
            </div>
            {lowStockQuery.data.blockedKits.length > 0 && (
              <p className="text-sm text-destructive">
                לא ניתן להרכיב: {lowStockQuery.data.blockedKits.map((k) => `${k.bundle_title} (חסר ${k.limiting_title ?? '—'})`).join(' · ')}
              </p>
            )}
          </CardContent>
        </Card>
      )}
```
(`StatusBadge` already exists at the top of `Dashboard.tsx`.)

- [ ] **Step 2: Verify, commit**

tsc/eslint for `Dashboard.tsx`. Manual: with a part counted to 0 the card appears with the part and the kits it blocks; with everything fine the card is absent.

```bash
git add src/components/admin/Dashboard.tsx
git commit -m "Admin dashboard: low-stock card with blocked kits

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Settings — default threshold, reservation switch

**Files:**
- Modify: `src/hooks/useStoreSettings.ts`
- Modify: `src/components/admin/StoreSettings.tsx`

- [ ] **Step 1: Hook**

Add to `StoreSettings` interface: `low_stock_threshold_default: number; inventory_reserve_pending: boolean;`; to `DEFAULTS`: `low_stock_threshold_default: 5, inventory_reserve_pending: true`; in the mapping:

```ts
      const reserveRaw = map.get('inventory_reserve_pending');
      // …inside the returned object:
        low_stock_threshold_default: Number(map.get('low_stock_threshold_default') ?? DEFAULTS.low_stock_threshold_default),
        inventory_reserve_pending: reserveRaw === undefined || reserveRaw === null ? DEFAULTS.inventory_reserve_pending : Boolean(reserveRaw),
```

- [ ] **Step 2: Settings screen**

Schema: add `low_stock_threshold_default: z.coerce.number().int().min(0, 'סף לא תקין'),` and `inventory_reserve_pending: z.boolean(),`. Defaults: `low_stock_threshold_default: 5, inventory_reserve_pending: true`. `form.reset` and the `entries` array: add both keys. Add a card after the shipping card:

```tsx
        <Card>
          <CardHeader><CardTitle>מלאי</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="low_stock_threshold_default">סף התראה (ברירת מחדל לכל פריט)</Label>
              <Input id="low_stock_threshold_default" type="number" step="1" min="0" dir="ltr" {...form.register('low_stock_threshold_default')} />
              <p className="text-xs text-muted-foreground">פריט עם סף משלו (בטופס המוצר) מתעלם מהערך הזה.</p>
            </div>
            <div className="flex items-center gap-4">
              <Label htmlFor="inventory_reserve_pending">הזמנות ממתינות לתשלום שומרות מלאי</Label>
              <div className="flex items-center gap-2">
                <Switch id="inventory_reserve_pending" checked={form.watch('inventory_reserve_pending')} onCheckedChange={(c) => form.setValue('inventory_reserve_pending', c)} />
                <span className="text-sm">{form.watch('inventory_reserve_pending') ? 'כן — עד שעתיים מרגע יצירת ההזמנה' : 'לא — רק תשלום מוריד מהמלאי'}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">כתובות המייל להתראות ולהזמנות חדשות מוגדרות בשרת (ORDER_ALERT_EMAILS).</p>
          </CardContent>
        </Card>
```

- [ ] **Step 3: Verify, commit**

tsc/eslint for both files. Manual: set the threshold to 8 → `/admin/inventory` shows items ≤ 8 as נמוך; toggle the switch off → the overview's שמור column drops to 0 for pending test orders.

```bash
git add src/hooks/useStoreSettings.ts src/components/admin/StoreSettings.tsx
git commit -m "Admin settings: default low-stock threshold and reservation switch

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Shipping marks itself shipped; supplies alert; decline releases reservation

**Files:**
- Create: `api/_lib/lowStockEmail.ts`, `api/_lib/lowStockEmail.test.ts`
- Modify: `api/hfd-shipment.ts` (`OrderRow`, create update ~line 268, after the update, cancel update ~line 392)
- Modify: `api/payplus-callback.ts` (decline update ~line 163)

**Interfaces:**
- Consumes: `collectLowStockSupplies`, `parseAlertEmails`, `stampLowStockAlerted`, `LowStockItem` (core Task 4).
- Produces: `buildLowStockSubject`, `buildLowStockText`, `sendLowStockEmail`, `notifyLowStockSuppliesAfterShipping(supabase, orderId, orderNumber)`.

- [ ] **Step 1: Failing tests**

`api/_lib/lowStockEmail.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildLowStockSubject, buildLowStockText } from "./lowStockEmail.js";
import type { LowStockItem } from "./inventory.js";

const item = (title: string, available: number, blockedKits: string[] = []): LowStockItem =>
  ({ kind: "supply", id: title, title, sku: null, available, threshold: 5, status: available <= 0 ? "out" : "low", blockedKits });

describe("buildLowStockSubject", () => {
  it("names up to two items and counts the rest", () => {
    expect(buildLowStockSubject([item("קופסה", 2)])).toBe("מלאי נמוך: קופסה");
    expect(buildLowStockSubject([item("קופסה", 2), item("כרטיס", 0), item("סרט", 1)])).toBe("מלאי נמוך: קופסה, כרטיס ועוד 1");
  });
});

describe("buildLowStockText", () => {
  it("lists each item with what is left and the context line", () => {
    const text = buildLowStockText([item("קופסה", 2), item("כרטיס", 0, ["מארז יין"])], "אחרי שידור משלוח להזמנה #1042");
    expect(text).toContain("אחרי שידור משלוח להזמנה #1042");
    expect(text).toContain("- קופסה: נשארו 2 (סף 5)");
    expect(text).toContain("- כרטיס: נשארו 0 (סף 5) — חוסם: מארז יין");
  });
});
```

Run `npm test -- api/_lib/lowStockEmail.test.ts` → FAIL (module not found).

- [ ] **Step 2: `api/_lib/lowStockEmail.ts`**

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { collectLowStockSupplies, parseAlertEmails, stampLowStockAlerted, type LowStockItem } from "./inventory.js";

/** Standalone low-stock email (spec §5): used when a dip happens outside the paid path — supplies consumed at shipping. */

const DEFAULT_FROM = "יום האם <orders@noreply.mothersday.co.il>";
const ADMIN_INVENTORY_URL = "https://www.mothersday.co.il/admin/inventory";

const line = (i: LowStockItem) =>
  `${i.title}${i.sku ? ` (${i.sku})` : ""}: נשארו ${i.available} (סף ${i.threshold})` +
  (i.blockedKits.length ? ` — חוסם: ${i.blockedKits.join(", ")}` : "");

export const buildLowStockSubject = (items: LowStockItem[]) => {
  const names = items.slice(0, 2).map((i) => i.title).join(", ");
  return `מלאי נמוך: ${names}${items.length > 2 ? ` ועוד ${items.length - 2}` : ""}`;
};

export const buildLowStockText = (items: LowStockItem[], context: string) =>
  ["מלאי נמוך", context, "", ...items.map((i) => `- ${line(i)}`), "", `למסך המלאי: ${ADMIN_INVENTORY_URL}`].join("\n");

export const buildLowStockHtml = (items: LowStockItem[], context: string) =>
  `<!DOCTYPE html><html dir="rtl" lang="he"><body style="font-family:Assistant,Arial,sans-serif;color:#4d3c40;padding:24px">
  <h1 style="font-size:18px">⚠ מלאי נמוך</h1><p>${context}</p>
  <ul>${items.map((i) => `<li>${line(i).replace(/&/g, "&amp;").replace(/</g, "&lt;")}</li>`).join("")}</ul>
  <p><a href="${ADMIN_INVENTORY_URL}">למסך המלאי</a></p></body></html>`;

export const sendLowStockEmail = async (to: string[], items: LowStockItem[], context: string) => {
  const resendApiKey = process.env.RESEND_API_KEY || process.env.resend_KEY;
  if (!resendApiKey) return { sent: false as const, reason: "missing_resend_api_key" };
  if (to.length === 0 || items.length === 0) return { sent: false as const, reason: "nothing_to_send" };
  const from = process.env.ORDER_CONFIRMATION_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || DEFAULT_FROM;
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: buildLowStockSubject(items), html: buildLowStockHtml(items, context), text: buildLowStockText(items, context) }),
    });
    if (!response.ok) return { sent: false as const, reason: await response.text() };
    return { sent: true as const };
  } catch (error) {
    return { sent: false as const, reason: error instanceof Error ? error.message : "unknown_error" };
  }
};

/** After an order is marked shipped: email the owners about supplies that just dipped. Never throws. */
export async function notifyLowStockSuppliesAfterShipping(supabase: SupabaseClient, orderId: string, orderNumber: number | null): Promise<void> {
  try {
    const to = parseAlertEmails(process.env.ORDER_ALERT_EMAILS);
    if (to.length === 0) return;
    const items = await collectLowStockSupplies(supabase, orderId);
    if (items.length === 0) return;
    const result = await sendLowStockEmail(to, items, `אחרי שידור משלוח להזמנה #${orderNumber ?? ""}`);
    if (result.sent) await stampLowStockAlerted(supabase, items);
    else console.error("low-stock supplies email not sent:", orderId, result.reason);
  } catch (error) {
    console.error("notifyLowStockSuppliesAfterShipping failed:", orderId, error);
  }
}
```

Run `npm test -- api/_lib/lowStockEmail.test.ts` → PASS.

- [ ] **Step 3: `api/hfd-shipment.ts`**

Add `import { notifyLowStockSuppliesAfterShipping } from "./_lib/lowStockEmail.js";` and `fulfillment_status?: string | null;` to `OrderRow`.

In `createShipment`, add `fulfillment_status: "shipped",` to the `.update({ hfd_shipment_number: … })` object (the trigger then consumes supplies). Right after the `if (updateError) { … }` block that follows it, add:

```ts
  // The orders_supplies trigger just consumed packaging; tell the owners if something dipped.
  await notifyLowStockSuppliesAfterShipping(supabase, order.id, order.order_number ?? null);
```

In `cancelShipment`, change the update to:

```ts
    .update({
      hfd_shipment_cancelled_at: new Date().toISOString(),
      tracking_number: null,
      // Back to the packing queue; supplies already consumed stay consumed (the box was used).
      ...(order.fulfillment_status === "shipped" ? { fulfillment_status: "unfulfilled" } : {}),
    })
```

Also update the OrderDetail hint text "מתמלא אוטומטית בשידור ל-HFD" — no code change needed; the status select will now already read נשלח after a shipment.

- [ ] **Step 4: `api/payplus-callback.ts` — declined charge releases the reservation sooner**

Replace the decline update:

```ts
    await supabase
      .from("orders")
      .update({
        payment_status_raw: txn.statusCode,
        // Release the stock reservation soon; the customer can still retry from the same page.
        expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      })
      .eq("id", orderId)
      .eq("financial_status", "pending");
```

- [ ] **Step 5: Verify, commit**

Run: `npx tsc --noEmit -p tsconfig.node.json 2>&1 | grep -E "hfd-shipment|payplus-callback|lowStockEmail"; npx eslint api/hfd-shipment.ts api/payplus-callback.ts api/_lib/lowStockEmail.ts api/_lib/lowStockEmail.test.ts; npm test`
Preview check (HFD test token in Preview): create a shipment for a paid test order → the order shows נשלח without touching the select, supplies decrease, and if a supply fell to ≤ its threshold both owners get "מלאי נמוך: …". Cancel the shipment → the order is back to לא נשלח; supplies unchanged.

```bash
git add api/_lib/lowStockEmail.ts api/_lib/lowStockEmail.test.ts api/hfd-shipment.ts api/payplus-callback.ts
git commit -m "HFD create marks shipped (consumes supplies) + supplies low-stock email; decline frees reservation in 15 min

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Docs and final verification

**Files:**
- Modify: `CLAUDE.md` (Inventory paragraph), memory `project-inventory-design.md`

- [ ] **Step 1: Docs**

Append to the CLAUDE.md Inventory paragraph: "Phase 2 (2026-09): `/admin/inventory/receive`, `/count`, `/supplies`; pick list + manual return on the order card (`OrderPickList`, `OrderRestockDialog`); לאריזה filter; dashboard מלאי נמוך card; settings `low_stock_threshold_default` / `inventory_reserve_pending`; HFD create sets `fulfillment_status='shipped'` (consumes supplies, emails owners via `api/_lib/lowStockEmail.ts`), cancel reverts to unfulfilled; a declined PayPlus charge sets `expires_at = now+15m`." Update the memory file status to "Phase 2 implemented".

- [ ] **Step 2: Verification**

```bash
npm test
npm run build
PGPASSWORD=$(security find-generic-password -s mothersday-supabase-db -w) $PSQL -f supabase/tests/inventory_scenarios.sql
```
Then the full preview walk-through with Eden: first real count via /admin/inventory/count (include untracked on), add the packaging supplies, place a simulated kit order, pack it from the pick list, ship it, watch the ledger and both emails. When Oron is satisfied, merge `launch/payplus` → `main`.

```bash
git add CLAUDE.md
git commit -m "Docs: inventory phase 2

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
git push origin launch/payplus
```

---

## Self-review notes

- Spec coverage: §7.2 → Task 1; §7.3 → Task 2; §7.7 → Task 3; §7.5 → Tasks 4–5; §7.8 → Tasks 6–7; §4.5 + §5 (HFD shipped, supplies email, decline expiry) → Task 8.
- Names reused from the core plan: `recordMovements`, `INVENTORY_QUERY_KEY`, `variantDisplayTitle`, `stockStatusBadge`, `sortByUrgency`, `formatDelta`, `InventoryAdjustDialog { open, onOpenChange, target, mode }`, `collectLowStockSupplies`, `parseAlertEmails`, `stampLowStockAlerted`, views `variant_stock` / `supply_stock` / `kit_stock` / `inventory_movement_log`.
