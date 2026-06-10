import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2 } from 'lucide-react';

interface Discount {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  first_order_only: boolean;
  expires_at: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
}

const EMPTY_FORM = {
  code: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  min_order_amount: '',
  max_uses: '',
  first_order_only: false,
  expires_at: '',
  is_active: true,
  description: '',
};

export const DiscountList = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: discounts, isLoading } = useQuery({
    queryKey: ['admin', 'discounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discounts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Discount[];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin', 'discounts'] });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (d: Discount) => {
    setEditingId(d.id);
    setForm({
      code: d.code,
      discount_type: d.discount_type,
      discount_value: String(d.discount_value),
      min_order_amount: d.min_order_amount ? String(d.min_order_amount) : '',
      max_uses: d.max_uses != null ? String(d.max_uses) : '',
      first_order_only: d.first_order_only,
      expires_at: d.expires_at ? d.expires_at.slice(0, 10) : '',
      is_active: d.is_active,
      description: d.description ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const code = form.code.trim().toUpperCase();
    const value = Number(form.discount_value);
    if (!code) {
      toast.error('נא להזין קוד');
      return;
    }
    if (!value || value <= 0) {
      toast.error('נא להזין ערך הנחה חיובי');
      return;
    }
    if (form.discount_type === 'percentage' && value > 100) {
      toast.error('אחוז הנחה לא יכול לעלות על 100');
      return;
    }

    const payload = {
      code,
      discount_type: form.discount_type,
      discount_value: value,
      min_order_amount: Number(form.min_order_amount) || 0,
      max_uses: form.max_uses === '' ? null : Number(form.max_uses),
      first_order_only: form.first_order_only,
      expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
      is_active: form.is_active,
      description: form.description.trim() || null,
    };

    setSaving(true);
    try {
      const { error } = editingId
        ? await supabase.from('discounts').update(payload).eq('id', editingId)
        : await supabase.from('discounts').insert(payload);

      if (error) {
        if (error.code === '23505') {
          toast.error('קוד זה כבר קיים');
        } else {
          throw error;
        }
        return;
      }

      toast.success(editingId ? 'הקופון עודכן' : 'הקופון נוצר');
      setDialogOpen(false);
      refresh();
    } catch {
      toast.error('משהו השתבש, נסי שוב');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (d: Discount) => {
    const { error } = await supabase
      .from('discounts')
      .update({ is_active: !d.is_active })
      .eq('id', d.id);
    if (error) {
      toast.error('לא הצלחנו לעדכן');
      return;
    }
    refresh();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('discounts').delete().eq('id', deleteId);
    setDeleteId(null);
    if (error) {
      toast.error('לא הצלחנו למחוק');
      return;
    }
    toast.success('הקופון נמחק');
    refresh();
  };

  const formatValue = (d: Discount) =>
    d.discount_type === 'percentage' ? `${d.discount_value}%` : `₪${d.discount_value}`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">הטבות וקופונים</h1>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 ml-2" />
          קופון חדש
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {!discounts || discounts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              עדיין אין קופונים. לחצי על "קופון חדש" כדי ליצור את הראשון.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">קוד</TableHead>
                  <TableHead className="text-right">הטבה</TableHead>
                  <TableHead className="text-right">מינ׳ הזמנה</TableHead>
                  <TableHead className="text-right">שימושים</TableHead>
                  <TableHead className="text-right">תוקף</TableHead>
                  <TableHead className="text-right">הזמנה ראשונה</TableHead>
                  <TableHead className="text-right">פעיל</TableHead>
                  <TableHead className="text-right">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {discounts.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-semibold" dir="ltr">{d.code}</TableCell>
                    <TableCell>{formatValue(d)}</TableCell>
                    <TableCell>{d.min_order_amount > 0 ? `₪${d.min_order_amount}` : '—'}</TableCell>
                    <TableCell>
                      {d.used_count} / {d.max_uses != null ? d.max_uses : '∞'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {d.expires_at
                        ? format(new Date(d.expires_at), 'dd/MM/yy', { locale: he })
                        : 'ללא'}
                    </TableCell>
                    <TableCell>
                      {d.first_order_only ? <Badge variant="secondary">בלבד</Badge> : '—'}
                    </TableCell>
                    <TableCell>
                      <Switch checked={d.is_active} onCheckedChange={() => toggleActive(d)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(d)} aria-label="עריכה">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(d.id)} aria-label="מחיקה">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'עריכת קופון' : 'קופון חדש'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="code">קוד קופון</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="WELCOME10"
                dir="ltr"
                className="text-right"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>סוג הנחה</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={(v) => setForm({ ...form, discount_type: v as 'percentage' | 'fixed' })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">אחוז (%)</SelectItem>
                    <SelectItem value="fixed">סכום (₪)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="value">{form.discount_type === 'percentage' ? 'אחוז' : 'סכום (₪)'}</Label>
                <Input
                  id="value"
                  type="number"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  placeholder={form.discount_type === 'percentage' ? '10' : '50'}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="min">מינ׳ הזמנה (₪)</Label>
                <Input
                  id="min"
                  type="number"
                  value={form.min_order_amount}
                  onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="max">מגבלת שימושים</Label>
                <Input
                  id="max"
                  type="number"
                  value={form.max_uses}
                  onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  placeholder="ללא הגבלה"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expires">תוקף (אופציונלי)</Label>
              <Input
                id="expires"
                type="date"
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="desc">תיאור (פנימי)</Label>
              <Input
                id="desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="למשל: הטבת הרשמה לניוזלטר"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="first">הזמנה ראשונה בלבד</Label>
              <Switch
                id="first"
                checked={form.first_order_only}
                onCheckedChange={(c) => setForm({ ...form, first_order_only: c })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="active">פעיל</Label>
              <Switch
                id="active"
                checked={form.is_active}
                onCheckedChange={(c) => setForm({ ...form, is_active: c })}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'שומר...' : editingId ? 'שמירה' : 'יצירה'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את הקופון?</AlertDialogTitle>
            <AlertDialogDescription>הפעולה אינה הפיכה.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              מחיקה
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
