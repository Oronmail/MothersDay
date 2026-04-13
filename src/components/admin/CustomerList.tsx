import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, Search } from 'lucide-react';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);

export const CustomerList = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: customers, isLoading } = useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, phone, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Fetch order stats per customer
  const { data: orderStats } = useQuery({
    queryKey: ['admin', 'customer-order-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('user_id, total_price');
      if (error) throw error;

      const stats = new Map<string, { count: number; total: number }>();
      for (const order of data ?? []) {
        const userId = order.user_id;
        if (!userId) continue;
        const existing = stats.get(userId) ?? { count: 0, total: 0 };
        existing.count += 1;
        existing.total += parseFloat(String(order.total_price)) || 0;
        stats.set(userId, existing);
      }
      return stats;
    },
  });

  const filtered = customers?.filter((c: any) =>
    (c.full_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.phone ?? '').includes(search)
  ) ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">לקוחות</h1>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש לפי שם או טלפון..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">אין לקוחות</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">שם</TableHead>
                  <TableHead className="text-right">טלפון</TableHead>
                  <TableHead className="text-right">הזמנות</TableHead>
                  <TableHead className="text-right">סה"כ קניות</TableHead>
                  <TableHead className="text-right">הצטרפות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((customer: any) => {
                  const stats = orderStats?.get(customer.id);
                  return (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/admin/customers/${customer.id}`)}
                    >
                      <TableCell className="font-medium">
                        {customer.full_name ?? '---'}
                      </TableCell>
                      <TableCell dir="ltr" className="text-right">
                        {customer.phone ?? '---'}
                      </TableCell>
                      <TableCell>{stats?.count ?? 0}</TableCell>
                      <TableCell>{formatCurrency(stats?.total ?? 0)}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {customer.created_at
                          ? format(new Date(customer.created_at), 'dd/MM/yy', { locale: he })
                          : '---'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
