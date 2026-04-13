import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Search, Download } from 'lucide-react';

export const NewsletterList = () => {
  const [search, setSearch] = useState('');

  const { data: subscribers, isLoading } = useQuery({
    queryKey: ['admin', 'newsletter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('newsletter_subscribers')
        .select('*')
        .order('subscribed_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = subscribers?.filter((s: any) =>
    (s.email ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.phone ?? '').includes(search)
  ) ?? [];

  const exportCSV = () => {
    if (!subscribers || subscribers.length === 0) {
      toast.error('אין נתונים לייצוא');
      return;
    }

    const csv = 'email,name,phone,active\n' +
      subscribers
        .map(
          (s: any) =>
            `${s.email},${s.name || ''},${s.phone || ''},${s.is_active}`
        )
        .join('\n');

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
          <div className="text-sm text-muted-foreground mb-4">
            סה"כ: {subscribers?.length ?? 0} נרשמים | פעילים: {subscribers?.filter((s: any) => s.is_active).length ?? 0}
          </div>
          {filtered.length === 0 ? (
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
                {filtered.map((subscriber: any) => (
                  <TableRow key={subscriber.id}>
                    <TableCell dir="ltr" className="text-right">
                      {subscriber.email}
                    </TableCell>
                    <TableCell>{subscriber.name ?? '---'}</TableCell>
                    <TableCell dir="ltr" className="text-right">
                      {subscriber.phone ?? '---'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={subscriber.is_active ? 'default' : 'secondary'}>
                        {subscriber.is_active ? 'פעיל' : 'לא פעיל'}
                      </Badge>
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
