import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, PackageCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdminErrorState } from './AdminErrorState';
import {
  FINANCIAL_STATUS_OPTIONS, FULFILLMENT_STATUS_OPTIONS,
  financialStatusBadge, fulfillmentStatusBadge,
  formatCurrency, getCustomerEmail, getCustomerName, getCustomerPhone, getItemsCount,
  type AdminOrder,
} from './adminOrders';

const StatusBadge = ({ label, className }: { label: string; className: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {label}
  </span>
);

export const OrderList = () => {
  const navigate = useNavigate();
  const [financialFilter, setFinancialFilter] = useState<string>('all');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>('all');

  const isPackingQueue = financialFilter === 'paid' && fulfillmentFilter === 'unfulfilled';
  const togglePackingQueue = () => {
    if (isPackingQueue) { setFinancialFilter('all'); setFulfillmentFilter('all'); }
    else { setFinancialFilter('paid'); setFulfillmentFilter('unfulfilled'); }
  };

  const { data: orders, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'orders'],
    queryFn: async (): Promise<AdminOrder[]> => {
      const { data, error: queryError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      if (queryError) throw queryError;
      return (data ?? []) as AdminOrder[];
    },
  });

  const packingCount = orders?.filter((o) => o.financial_status === 'paid' && o.fulfillment_status === 'unfulfilled').length ?? 0;

  const filtered = orders?.filter((order) => {
    if (financialFilter !== 'all' && order.financial_status !== financialFilter) return false;
    if (fulfillmentFilter !== 'all' && order.fulfillment_status !== fulfillmentFilter) return false;
    return true;
  }) ?? [];

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
                  {FINANCIAL_STATUS_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
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
                  {FULFILLMENT_STATUS_OPTIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant={isPackingQueue ? 'default' : 'outline'} size="sm" onClick={togglePackingQueue}>
              <PackageCheck className="w-4 h-4 ml-2" />לאריזה ({packingCount})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isError ? (
            <AdminErrorState
              error={error}
              onRetry={() => refetch()}
              title="לא הצלחנו לטעון את ההזמנות"
              compact
            />
          ) : filtered.length === 0 ? (
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
                {filtered.map((order) => {
                  const name = getCustomerName(order);
                  const email = getCustomerEmail(order);
                  const phone = getCustomerPhone(order);
                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                    >
                      <TableCell className="font-mono text-sm">
                        {order.order_number ?? order.id?.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{name ?? email ?? '---'}</div>
                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            dir="ltr"
                            className="block text-xs text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {phone}
                          </a>
                        )}
                      </TableCell>
                      <TableCell>{getItemsCount(order)}</TableCell>
                      <TableCell>{formatCurrency(order.total_price)}</TableCell>
                      <TableCell>
                        <StatusBadge {...financialStatusBadge(order.financial_status ?? 'pending')} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge {...fulfillmentStatusBadge(order.fulfillment_status ?? 'unfulfilled')} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {order.created_at
                          ? format(new Date(order.created_at), 'dd/MM/yy HH:mm', { locale: he })
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
