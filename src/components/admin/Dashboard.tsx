import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { startOfMonth, format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  pending: { label: 'ממתין', className: 'bg-yellow-500/20 text-yellow-500' },
  paid: { label: 'שולם', className: 'bg-green-500/20 text-green-500' },
  refunded: { label: 'הוחזר', className: 'bg-red-500/20 text-red-500' },
  unfulfilled: { label: 'לא נשלח', className: 'bg-gray-500/20 text-gray-500' },
  shipped: { label: 'נשלח', className: 'bg-blue-500/20 text-blue-500' },
  delivered: { label: 'נמסר', className: 'bg-green-500/20 text-green-500' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const config = STATUS_LABELS[status] ?? { label: status, className: 'bg-gray-500/20 text-gray-500' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(amount);

export const Dashboard = () => {
  const monthStart = startOfMonth(new Date()).toISOString();

  // Orders this month (paid) for revenue + count
  const { data: monthOrders } = useQuery({
    queryKey: ['admin', 'month-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('total_price, created_at')
        .gte('created_at', monthStart)
        .eq('financial_status', 'paid');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Customer count
  const { data: customerCount } = useQuery({
    queryKey: ['admin', 'customer-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'customer');
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Recent orders
  const { data: recentOrders } = useQuery({
    queryKey: ['admin', 'recent-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Top selling products (30 days)
  const { data: topProducts } = useQuery({
    queryKey: ['admin', 'top-products'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('orders')
        .select('line_items, created_at')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('financial_status', 'paid');
      if (error) throw error;

      // Aggregate line_items across all orders
      const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
      for (const order of data ?? []) {
        const items = (order.line_items as Array<{ title?: string; name?: string; quantity?: number; price?: number }>) ?? [];
        for (const item of items) {
          const name = item.title ?? item.name ?? 'ללא שם';
          const existing = productMap.get(name);
          const qty = item.quantity ?? 1;
          const price = item.price ?? 0;
          if (existing) {
            existing.quantity += qty;
            existing.revenue += price * qty;
          } else {
            productMap.set(name, { name, quantity: qty, revenue: price * qty });
          }
        }
      }

      return Array.from(productMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);
    },
  });

  const revenue = monthOrders?.reduce((sum, o) => sum + (o.total_price ?? 0), 0) ?? 0;
  const orderCount = monthOrders?.length ?? 0;
  const avgOrder = orderCount > 0 ? revenue / orderCount : 0;

  const stats = [
    { title: 'הכנסות (חודש)', value: formatCurrency(revenue), icon: DollarSign },
    { title: 'הזמנות (חודש)', value: orderCount.toString(), icon: ShoppingCart },
    { title: 'ממוצע הזמנה', value: formatCurrency(avgOrder), icon: TrendingUp },
    { title: 'לקוחות', value: (customerCount ?? 0).toString(), icon: Users },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">דשבורד</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ title, value, icon: Icon }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              <Icon className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">הזמנות אחרונות</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders && recentOrders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="text-right py-2 px-2 font-medium">מספר</th>
                      <th className="text-right py-2 px-2 font-medium">לקוח</th>
                      <th className="text-right py-2 px-2 font-medium">סכום</th>
                      <th className="text-right py-2 px-2 font-medium">תשלום</th>
                      <th className="text-right py-2 px-2 font-medium">משלוח</th>
                      <th className="text-right py-2 px-2 font-medium">תאריך</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="border-b border-border/50 hover:bg-accent/50">
                        <td className="py-2 px-2 font-mono text-xs">
                          {order.order_number ?? order.id?.slice(0, 8)}
                        </td>
                        <td className="py-2 px-2">
                          {order.customer_name ?? order.shipping_address?.name ?? '—'}
                        </td>
                        <td className="py-2 px-2">{formatCurrency(order.total_price ?? 0)}</td>
                        <td className="py-2 px-2">
                          <StatusBadge status={order.financial_status ?? 'pending'} />
                        </td>
                        <td className="py-2 px-2">
                          <StatusBadge status={order.fulfillment_status ?? 'unfulfilled'} />
                        </td>
                        <td className="py-2 px-2 text-muted-foreground text-xs">
                          {order.created_at
                            ? format(new Date(order.created_at), 'dd/MM/yy', { locale: he })
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">אין הזמנות עדיין</p>
            )}
          </CardContent>
        </Card>

        {/* Top selling products */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">מוצרים מובילים (30 יום)</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts && topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.map((product, i) => (
                  <div key={product.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground w-5 text-center">{i + 1}</span>
                      <span className="truncate">{product.name}</span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-muted-foreground">{product.quantity} יח׳</span>
                      <span className="font-medium">{formatCurrency(product.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">אין נתונים עדיין</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
