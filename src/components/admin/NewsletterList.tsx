import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Search, Download } from 'lucide-react';
import { AdminErrorState } from './AdminErrorState';

interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  is_active: boolean | null;
  subscribed_at: string | null;
}

/**
 * Quote every CSV field and double any internal quote, so a comma or a quote inside
 * a name can't shift the columns. A leading =/+/-/@ gets an apostrophe so Excel
 * treats the value as text instead of a formula.
 */
const csvField = (value: unknown): string => {
  const raw = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const NewsletterList = () => {
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const { data: subscribers, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'newsletter'],
    queryFn: async (): Promise<Subscriber[]> => {
      const { data, error: queryError } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false });
      if (queryError) throw queryError;
      return (data ?? []) as Subscriber[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async (subscriber: Subscriber) => {
      const nextValue = !subscriber.is_active;
      const { error: updateError } = await supabase
        .from('newsletter_subscribers')
        .update({ is_active: nextValue })
        .eq('id', subscriber.id);
      if (updateError) throw updateError;
      return nextValue;
    },
    onSuccess: (nowActive) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'newsletter'] });
      toast.success(nowActive ? 'הנרשמת הופעלה מחדש' : 'הנרשמת סומנה כלא פעילה');
    },
    onError: () => {
      toast.error('לא הצלחנו לעדכן את הסטטוס, נסי שוב');
    },
  });

  const filtered = subscribers?.filter((s) =>
    (s.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.phone ?? '').includes(search)
  ) ?? [];

  const exportCSV = () => {
    if (!subscribers || subscribers.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }

    const rows: string[][] = [
      ['email', 'name', 'phone', 'active', 'subscribed_at'],
      ...subscribers.map((s) => [
        s.email ?? '',
        s.name ?? '',
        s.phone ?? '',
        s.is_active ? 'כן' : 'לא',
        s.subscribed_at ? format(new Date(s.subscribed_at), 'yyyy-MM-dd HH:mm') : '',
      ]),
    ];
    const csv = rows.map((row) => row.map(csvField).join(',')).join('\r\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `newsletter-subscribers-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('הקובץ הורד בהצלחה');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ניוזלטר</h1>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="w-4 h-4 ml-2" />
          ייצוא CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי אימייל, שם או טלפון..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {!isError && (
            <div className="text-sm text-muted-foreground mb-4">
              סה"כ: {subscribers?.length ?? 0} נרשמים | פעילים: {subscribers?.filter((s) => s.is_active).length ?? 0}
            </div>
          )}
          {isError ? (
            <AdminErrorState
              error={error}
              onRetry={() => refetch()}
              title="לא הצלחנו לטעון את רשימת הנרשמים"
              compact
            />
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">אין נרשמים</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">אימייל</TableHead>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">טלפון</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">תאריך הרשמה</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((subscriber) => (
                  <TableRow key={subscriber.id}>
                    <TableCell dir="ltr" className="text-right">
                      {subscriber.email}
                    </TableCell>
                    <TableCell>{subscriber.name ?? '---'}</TableCell>
                    <TableCell dir="ltr" className="text-right">
                      {subscriber.phone ?? '---'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={!!subscriber.is_active}
                          disabled={toggleActive.isPending}
                          onCheckedChange={() => toggleActive.mutate(subscriber)}
                          aria-label={
                            subscriber.is_active
                              ? `סימון ${subscriber.email} כלא פעילה`
                              : `הפעלה מחדש של ${subscriber.email}`
                          }
                        />
                        <span className="text-sm text-muted-foreground">
                          {subscriber.is_active ? 'פעיל' : 'לא פעיל'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {subscriber.subscribed_at
                        ? format(new Date(subscriber.subscribed_at), 'dd/MM/yy HH:mm', { locale: he })
                        : '---'}
                    </TableCell>
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
