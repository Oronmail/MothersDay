import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { startOfMonth, format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, DollarSign, ShoppingCart, TrendingUp, Users } from 'lucide-react';
import { AdminErrorState } from './AdminErrorState';
import {
  financialStatusBadge, fulfillmentStatusBadge, formatCurrency, getCustomerEmail, getCustomerName,
  type AdminOrder,
} from './adminOrders';
import {
  INVENTORY_QUERY_KEY, sortByUrgency, stockStatusBadge, variantDisplayTitle,
  type KitStockRow, type SupplyStockRow, type StockStatus, type VariantStockRow,
} from './adminInventory';

const StatusBadge = ({ label, className }: { label: string; className: string }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {label}
  </span>
);

export const Dashboard = () => {
  const monthStart = startOfMonth(new Date()).toISOString();

  // Orders this month (paid) for revenue + count
  const monthOrdersQuery = useQuery({
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
  const monthOrders = monthOrdersQuery.data;

  // Customer count
  const customerCountQuery = useQuery({
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
  const customerCount = customerCountQuery.data;

  // Recent orders
  const recentOrdersQuery = useQuery({
    queryKey: ['admin', 'recent-orders'],
    queryFn: async (): Promise<AdminOrder[]> => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as AdminOrder[];
    },
  });
  const recentOrders = recentOrdersQuery.data;

  // Top selling products (30 days)
  const topProductsQuery = useQuery({
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

  const topProducts = topProductsQuery.data;

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
      const items: { key: string; title: string; available: number; threshold: number; status: StockStatus }[] = [
        ...((variants.data ?? []) as VariantStockRow[]).map((v) => ({ key: v.variant_id, title: variantDisplayTitle(v), available: v.available ?? 0, threshold: v.threshold, status: v.status })),
        ...((supplies.data ?? []) as SupplyStockRow[]).map((s) => ({ key: s.supply_id, title: `אריזה: ${s.name}`, available: s.on_hand, threshold: s.threshold, status: s.status })),
      ];
      return { items: sortByUrgency(items, (i) => i.title), blockedKits: (kits.data ?? []) as KitStockRow[] };
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

  const statsError = monthOrdersQuery.isError || customerCountQuery.isError;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">דשבורד</h1>

      {/* Stats cards */}
      {statsError ? (
        <AdminErrorState
          error={monthOrdersQuery.error ?? customerCountQuery.error}
          title="לא הצלחנו לטעון את הנתונים המסכמים"
          onRetry={() => {
            monthOrdersQuery.refetch();
            customerCountQuery.refetch();
          }}
        />
      ) : (
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
      )}

      {lowStockQuery.isError && (
        <AdminErrorState
          error={lowStockQuery.error}
          onRetry={() => lowStockQuery.refetch()}
          title="לא הצלחנו לטעון את מצב המלאי"
          compact
        />
      )}

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">הזמנות אחרונות</CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrdersQuery.isError ? (
              <AdminErrorState
                error={recentOrdersQuery.error}
                onRetry={() => recentOrdersQuery.refetch()}
                title="לא הצלחנו לטעון את ההזמנות האחרונות"
                compact
              />
            ) : recentOrders && recentOrders.length > 0 ? (
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
                          {getCustomerName(order) ?? getCustomerEmail(order) ?? '—'}
                        </td>
                        <td className="py-2 px-2">{formatCurrency(order.total_price ?? 0)}</td>
                        <td className="py-2 px-2">
                          <StatusBadge {...financialStatusBadge(order.financial_status ?? 'pending')} />
                        </td>
                        <td className="py-2 px-2">
                          <StatusBadge {...fulfillmentStatusBadge(order.fulfillment_status ?? 'unfulfilled')} />
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
            {topProductsQuery.isError ? (
              <AdminErrorState
                error={topProductsQuery.error}
                onRetry={() => topProductsQuery.refetch()}
                title="לא הצלחנו לטעון את המוצרים המובילים"
                compact
              />
            ) : topProducts && topProducts.length > 0 ? (
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
