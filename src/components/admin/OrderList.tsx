import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

const FINANCIAL_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'ממתין', className: 'bg-yellow-500/20 text-yellow-700' },
  paid: { label: 'שולם', className: 'bg-green-500/20 text-green-700' },
  refunded: { label: 'הוחזר', className: 'bg-red-500/20 text-red-700' },
};

const FULFILLMENT_STATUS: Record<string, { label: string; className: string }> = {
  unfulfilled: { label: 'לא נשלח', className: 'bg-gray-500/20 text-gray-700' },
  shipped: { label: 'נשלח', className: 'bg-blue-500/20 text-blue-700' },
  delivered: { label: 'נמסר', className: 'bg-green-500/20 text-green-700' },
};

const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(num || 0);
};

const StatusBadge = ({ status, map }: { status: string; map: Record<string, { label: string; className: string }> }) => {
  const config = map[status] ?? { label: status, className: 'bg-gray-500/20 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

export const OrderList = () => {
  const navigate = useNavigate();
  const [financialFilter, setFinancialFilter] = useState<string>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('all');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = orders?.filter((order: any) => {
    if (financialFilter !== 'all' && order.financial_status !== financialFilter) return false;
    if (fulfillmentFilter !== 'all' && order.fulfillment_status !== fulfillmentFilter) return false;
    return true;
  }) ?? [];

  const getCustomerName = (order: any): string => {
    if (order.customer_name) return order.customer_name;
    const addr = order.shipping_address;
    if (addr && typeof addr === 'object') {
      return (addr as any).name || (addr as any).full_name || '---';
    }
    return '---';
  };

  const getItemsCount = (order: any): number => {
    const items = order.line_items;
    if (Array.isArray(items)) {
      return items.reduce((sum: number, item: any) => sum + (item.quantity ?? 1), 0);
    }
    return 0;
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
      <h1 className="text-2xl font-bold">הזמנות</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">תשלום:</span>
              <Select value={financialFilter} onValueChange={setFinancialFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="pending">ממתין</SelectItem>
                  <SelectItem value="paid">שולם</SelectItem>
                  <SelectItem value="refunded">הוחזר</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">משלוח:</span>
              <Select value={fulfillmentFilter} onValueChange={setFulfillmentFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="unfulfilled">לא נשלח</SelectItem>
                  <SelectItem value="shipped">נשלח</SelectItem>
                  <SelectItem value="delivered">נמסר</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">אין הזמנות</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">מספר הזמנה</TableHead>
                  <TableHead className="text-right">לקוח</TableHead>
                  <TableHead className="text-right">פריטים</TableHead>
                  <TableHead className="text-right">סכום</TableHead>
                  <TableHead className="text-right">תשלום</TableHead>
                  <TableHead className="text-right">משלוח</TableHead>
                  <TableHead className="text-right">תאריך</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((order: any) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer"
                    onClick={() => navigate(`/admin/orders/${order.id}`)}
                  >
                    <TableCell className="font-mono text-sm">
                      {order.order_number ?? order.id?.slice(0, 8)}
                    </TableCell>
                    <TableCell>{getCustomerName(order)}</TableCell>
                    <TableCell>{getItemsCount(order)}</TableCell>
                    <TableCell>{formatCurrency(order.total_price)}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.financial_status ?? 'pending'} map={FINANCIAL_STATUS} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.fulfillment_status ?? 'unfulfilled'} map={FULFILLMENT_STATUS} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {order.created_at
                        ? format(new Date(order.created_at), 'dd/MM/yy HH:mm', { locale: he })
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
