import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, ArrowRight } from 'lucide-react';
import { AdminErrorState } from './AdminErrorState';
import { financialStatusLabel, formatCurrency } from './adminOrders';

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  paid: 'default',
  failed: 'destructive',
  cancelled: 'secondary',
  refunded: 'destructive',
};

export const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ['admin', 'customer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const {
    data: orders,
    isLoading: loadingOrders,
    isError: ordersError,
    error: ordersErrorObject,
    refetch: refetchOrders,
  } = useQuery({
    queryKey: ['admin', 'customer-orders', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', id!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: addresses } = useQuery({
    queryKey: ['admin', 'customer-addresses', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', id!)
        .order('is_default', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (loadingCustomer) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">לקוח לא נמצא</p>
      </div>
    );
  }

  const totalSpent = orders?.reduce((sum: number, o: any) => sum + (parseFloat(String(o.total_price)) || 0), 0) ?? 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="חזרה לרשימת הלקוחות"
          onClick={() => navigate('/admin/customers')}
        >
          <ArrowRight className="w-4 h-4" />
        </Button>
        <h1 className="text-2xl font-bold">{customer.full_name ?? 'לקוח'}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Info */}
        <Card>
          <CardHeader>
            <CardTitle>פרטים אישיים</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <span className="text-muted-foreground">שם: </span>
              <span className="font-medium">{customer.full_name ?? '---'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">טלפון: </span>
              <span className="font-medium" dir="ltr">{customer.phone ?? '---'}</span>
            </div>
            <div>
              <span className="text-muted-foreground">הצטרפות: </span>
              <span>
                {customer.created_at
                  ? format(new Date(customer.created_at), 'dd/MM/yyyy', { locale: he })
                  : '---'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">הזמנות: </span>
              <span className="font-medium">{orders?.length ?? 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground">סה"כ קניות: </span>
              <span className="font-medium">{formatCurrency(totalSpent)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Saved Addresses */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>כתובות שמורות</CardTitle>
          </CardHeader>
          <CardContent>
            {addresses && addresses.length > 0 ? (
              <div className="space-y-3">
                {addresses.map((addr: any) => (
                  <div key={addr.id} className="p-3 border rounded-md text-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{addr.label ?? 'כתובת'}</span>
                      {addr.is_default && (
                        <Badge variant="secondary">ברירת מחדל</Badge>
                      )}
                    </div>
                    <p>{addr.full_name}</p>
                    <p>{addr.street}, {addr.city}</p>
                    {addr.postal_code && <p>מיקוד: {addr.postal_code}</p>}
                    {addr.phone && <p dir="ltr" className="text-right">טלפון: {addr.phone}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">אין כתובות שמורות</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Order History */}
      <Card>
        <CardHeader>
          <CardTitle>היסטוריית הזמנות</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingOrders ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : ordersError ? (
            <AdminErrorState
              error={ordersErrorObject}
              onRetry={() => refetchOrders()}
              title="לא הצלחנו לטעון את ההזמנות של הלקוחה"
              compact
            />
          ) : orders && orders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-right">מספר הזמנה</TableHead>
                  <TableHead className="text-right">סכום</TableHead>
                  <TableHead className="text-right">סטטוס</TableHead>
                  <TableHead className="text-right">תאריך</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => {
                  const statusVariant = STATUS_VARIANT[order.financial_status] ?? 'secondary';
                  return (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                    >
                      <TableCell className="font-mono text-sm">
                        {order.order_number ?? order.id?.slice(0, 8)}
                      </TableCell>
                      <TableCell>{formatCurrency(order.total_price)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant}>{financialStatusLabel(order.financial_status)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {order.created_at
                          ? format(new Date(order.created_at), 'dd/MM/yy', { locale: he })
                          : '---'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-muted-foreground py-8">אין הזמנות</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
