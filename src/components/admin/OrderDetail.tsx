import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Loader2, ArrowRight } from 'lucide-react';

const formatCurrency = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(num || 0);
};

export const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [financialStatus, setFinancialStatus] = useState('pending');
  const [fulfillmentStatus, setFulfillmentStatus] = useState('unfulfilled');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');

  const { data: order, isLoading } = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (order) {
      setFinancialStatus(order.financial_status ?? 'pending');
      setFulfillmentStatus(order.fulfillment_status ?? 'unfulfilled');
      setTrackingNumber((order as any).tracking_number ?? '');
      setNotes((order as any).notes ?? '');
    }
  }, [order]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('orders')
        .update({
          financial_status: financialStatus,
          fulfillment_status: fulfillmentStatus,
          tracking_number: trackingNumber || null,
          notes: notes || null,
        } as any)
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'order', id] });
      toast.success('ההזמנה עודכנה בהצלחה');
    },
    onError: (err: any) => {
      toast.error(`שגיאה בעדכון ההזמנה: ${err.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">הזמנה לא נמצאה</p>
      </div>
    );
  }

  const shippingAddress = order.shipping_address as any;
  const lineItems = Array.isArray(order.line_items) ? order.line_items : [];
  const orderNumber = (order as any).shopify_order_number ?? (order as any).order_number ?? order.id?.slice(0, 8);

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/orders')}>
          <ArrowRight className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">הזמנה #{orderNumber}</h1>
          <p className="text-sm text-muted-foreground">
            {order.created_at
              ? format(new Date(order.created_at), 'dd/MM/yyyy HH:mm', { locale: he })
              : ''}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Details - left side */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>פריטים</CardTitle>
            </CardHeader>
            <CardContent>
              {lineItems.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">אין פריטים</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">תמונה</TableHead>
                      <TableHead className="text-right">מוצר</TableHead>
                      <TableHead className="text-right">כמות</TableHead>
                      <TableHead className="text-right">מחיר</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell>
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="w-12 h-12 object-cover rounded" />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.title ?? item.name ?? '---'}</TableCell>
                        <TableCell>{item.quantity ?? 1}</TableCell>
                        <TableCell>{formatCurrency(item.price ?? 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="flex justify-between items-center pt-4 mt-4 border-t">
                <span className="font-bold text-lg">סה"כ</span>
                <span className="font-bold text-lg">{formatCurrency(order.total_price)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Address */}
          <Card>
            <CardHeader>
              <CardTitle>כתובת למשלוח</CardTitle>
            </CardHeader>
            <CardContent>
              {shippingAddress ? (
                <div className="space-y-1 text-sm">
                  <p className="font-medium">{shippingAddress.name ?? shippingAddress.full_name ?? '---'}</p>
                  <p>{shippingAddress.street ?? shippingAddress.address1 ?? '---'}</p>
                  <p>
                    {shippingAddress.city ?? ''}
                    {shippingAddress.postal_code ? `, ${shippingAddress.postal_code}` : ''}
                  </p>
                  {shippingAddress.phone && <p>טלפון: {shippingAddress.phone}</p>}
                </div>
              ) : (
                <p className="text-muted-foreground">אין כתובת משלוח</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Status Management - right side */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>פרטי לקוח</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="text-muted-foreground">שם: </span>
                {shippingAddress?.name ?? shippingAddress?.full_name ?? '---'}
              </p>
              {(order as any).customer_email && (
                <p>
                  <span className="text-muted-foreground">אימייל: </span>
                  {(order as any).customer_email}
                </p>
              )}
              {shippingAddress?.phone && (
                <p>
                  <span className="text-muted-foreground">טלפון: </span>
                  {shippingAddress.phone}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>ניהול סטטוס</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>סטטוס תשלום</Label>
                <Select value={financialStatus} onValueChange={setFinancialStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">ממתין</SelectItem>
                    <SelectItem value="paid">שולם</SelectItem>
                    <SelectItem value="refunded">הוחזר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>סטטוס משלוח</Label>
                <Select value={fulfillmentStatus} onValueChange={setFulfillmentStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unfulfilled">לא נשלח</SelectItem>
                    <SelectItem value="shipped">נשלח</SelectItem>
                    <SelectItem value="delivered">נמסר</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(fulfillmentStatus === 'shipped' || fulfillmentStatus === 'delivered') && (
                <div className="space-y-2">
                  <Label htmlFor="tracking">מספר מעקב</Label>
                  <Input
                    id="tracking"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    dir="ltr"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">הערות</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="w-full"
              >
                {updateMutation.isPending && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                שמור שינויים
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
