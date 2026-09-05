import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ArrowRight, Download, Loader2 } from 'lucide-react';
import { AdminErrorState } from './AdminErrorState';
import {
  INVENTORY_QUERY_KEY, MOVEMENT_REASON_LABELS, formatDelta, movementsToCsv, type MovementLogRow, type MovementReason,
} from './adminInventory';

const PAGE = 500;

/** The ledger. Answers "why is the stock 3?" — every change with its reason, order and author. */
export const InventoryMovements = () => {
  const [reason, setReason] = useState<MovementReason | 'all'>('all');
  const [kind, setKind] = useState<'all' | 'variant' | 'supply'>('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const query = useQuery({
    queryKey: [...INVENTORY_QUERY_KEY, 'movements', from, to],
    queryFn: async (): Promise<MovementLogRow[]> => {
      let q = supabase.from('inventory_movement_log').select('*').order('created_at', { ascending: false }).limit(PAGE);
      if (from) q = q.gte('created_at', new Date(`${from}T00:00:00`).toISOString());
      if (to) q = q.lte('created_at', new Date(`${to}T23:59:59`).toISOString());
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as MovementLogRow[];
    },
  });

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (query.data ?? []).filter((r) => {
      if (reason !== 'all' && r.reason !== reason) return false;
      if (kind !== 'all' && r.item_kind !== kind) return false;
      if (needle && !`${r.item_title} ${r.sku ?? ''} ${r.reference ?? ''} ${r.note ?? ''}`.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [query.data, reason, kind, search]);

  const exportCsv = () => {
    const blob = new Blob(['﻿' + movementsToCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventory-movements-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/admin/inventory" aria-label="חזרה למלאי"><ArrowRight className="w-5 h-5" /></Link></Button>
          <h1 className="text-2xl font-bold">יומן תנועות מלאי</h1>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="w-4 h-4 ml-2" />ייצוא CSV ({rows.length})
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input placeholder="חיפוש: פריט, מק״ט, אסמכתא, הערה" value={search} onChange={(e) => setSearch(e.target.value)} className="lg:col-span-2" />
          <Select value={reason} onValueChange={(v) => setReason(v as MovementReason | 'all')}>
            <SelectTrigger><SelectValue placeholder="סיבה" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">כל הסיבות</SelectItem>
              {(Object.keys(MOVEMENT_REASON_LABELS) as MovementReason[]).map((r) => (
                <SelectItem key={r} value={r}>{MOVEMENT_REASON_LABELS[r]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={kind} onValueChange={(v) => setKind(v as 'all' | 'variant' | 'supply')}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">מוצרים וחומרי אריזה</SelectItem>
              <SelectItem value="variant">מוצרים בלבד</SelectItem>
              <SelectItem value="supply">חומרי אריזה בלבד</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="מתאריך" />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="עד תאריך" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          {query.isLoading ? (
            <div className="flex items-center justify-center h-40"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : query.isError ? (
            <AdminErrorState error={query.error} onRetry={() => query.refetch()} title="לא הצלחנו לטעון את יומן התנועות" />
          ) : rows.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">אין תנועות</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">תאריך</TableHead>
                  <TableHead className="text-right">פריט</TableHead>
                  <TableHead className="text-right">מק"ט</TableHead>
                  <TableHead className="text-right">שינוי</TableHead>
                  <TableHead className="text-right">מלאי אחרי</TableHead>
                  <TableHead className="text-right">סיבה</TableHead>
                  <TableHead className="text-right">הזמנה</TableHead>
                  <TableHead className="text-right">אסמכתא / הערה</TableHead>
                  <TableHead className="text-right">בוצע ע"י</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(r.created_at), 'dd/MM/yy HH:mm', { locale: he })}</TableCell>
                    <TableCell className="font-medium">{r.item_title}{r.item_kind === 'supply' && <span className="text-xs text-muted-foreground mr-2">· אריזה</span>}</TableCell>
                    <TableCell className="font-mono text-xs" dir="ltr">{r.sku ?? '—'}</TableCell>
                    <TableCell className={`font-mono tabular-nums ${r.delta < 0 ? 'text-destructive' : 'text-green-700'}`} dir="ltr">{formatDelta(r.delta)}</TableCell>
                    <TableCell className="font-mono tabular-nums" dir="ltr">{r.on_hand_after}</TableCell>
                    <TableCell>{MOVEMENT_REASON_LABELS[r.reason] ?? r.reason}</TableCell>
                    <TableCell>
                      {r.order_id ? <Link to={`/admin/orders/${r.order_id}`} className="hover:underline font-mono text-xs">#{r.order_number ?? r.order_id.slice(0, 8)}</Link> : '—'}
                    </TableCell>
                    <TableCell className="text-sm max-w-[280px]">
                      {r.reference && <div>{r.reference}</div>}
                      {r.note && <div className="text-muted-foreground">{r.note}</div>}
                      {!r.reference && !r.note && '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground break-all">{r.actor_email ?? 'מערכת'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
