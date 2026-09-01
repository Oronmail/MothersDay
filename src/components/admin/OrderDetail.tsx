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
import { AdminErrorState } from './AdminErrorState';
import {
  FINANCIAL_STATUS_OPTIONS, FULFILLMENT_STATUS_OPTIONS,
  financialStatusLabel, formatCurrency, getCustomerEmail, getCustomerName, getCustomerPhone,
  getLineItems, toNumber, type AdminOrder,
} from './adminOrders';

const formatDateTime = (value?: string | null) =>
  value ? format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: he }) : null;

/** One "label: value" row inside the payment card — rendered only when there is a value. */
const InfoRow = ({ label, value, ltr }: { label: string; value?: string | null; ltr?: boolean }) => {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={`text-left break-all ${ltr ? 'font-mono text-xs' : ''}`} dir={ltr ? 'ltr' : undefined}>
        {value}
      </span>
    </div>
  );
};

export const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [financialStatus, setFinancialStatus] = useState('pending');
  const [fulfillmentStatus, setFulfillmentStatus] = useState('unfulfilled');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [notes, setNotes] = useState('');

  const { data: order, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin', 'order', id],
    queryFn: async (): Promise<AdminOrder> => {
      const { data, error: queryError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id!)
        .single();
      if (queryError) throw queryError;
      return data as AdminOrder;
    },
  });

  useEffect(() => {
    if (order) {
      setFinancialStatus(order.financial_status ?? 'pending');
      setFulfillmentStatus(order.fulfillment_status ?? 'unfulfilled');
      setTrackingNumber(order.tracking_number ?? '');
      setNotes(order.notes ?? '');
    }
  }, [order]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      // Exactly these four columns. Everything payment-related (provider ids,
      // approval number, paid_at, payment_raw…) is written by the server, and an
      // update from here must never overwrite it.
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          financial_status: financialStatus,
          fulfillment_status: fulfillmentStatus,
          tracking_number: trackingNumber || null,
          notes: notes || null,
        })
        .eq('id', id!);
      if (updateError) throw updateError;
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

  if (isError) {
    return (
      <div className="max-w-2xl">
        <AdminErrorState
          error={error}
          onRetry={() => refetch()}
          title="לא הצלחנו לטעון את ההזמנה"
        />
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

  const shippingAddress = order.shipping_address;
  const lineItems = getLineItems(order);
  const orderNumber = order.order_number ?? order.id?.slice(0, 8);

  const customerName = getCustomerName(order);
  const customerEmail = getCustomerEmail(order);
  const customerPhone = getCustomerPhone(order);

  const subtotal = toNumber(order.subtotal);
  const shippingCost = toNumber(order.shipping_cost);
  const discountAmount = toNumber(order.discount_amount);

  const cardLabel = [order.card_brand, order.card_last4 ? `•••• ${order.card_last4}` : null]
    .filter(Boolean)
    .join(' ');
  const paidLabel = order.paid_amount != null ? formatCurrency(order.paid_amount) : null;
  const hasPaymentDetails = Boolean(
    order.payment_provider || cardLabel || order.approval_number || order.provider_transaction_id ||
    order.payment_page_request_uid || paidLabel || order.paid_at || order.payment_status_raw ||
    order.payment_attempts || order.cancelled_at || order.refunded_at || order.confirmation_email_sent_at ||
    order.payment_raw,
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label="חזרה לרשימת ההזמנות"
          onClick={() => navigate('/admin/orders')}
        >
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
                    {lineItems.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="w-12 h-12 object-cover rounded" />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.title ?? '---'}</TableCell>
                        <TableCell>{item.quantity ?? 1}</TableCell>
                        <TableCell>{formatCurrency(item.price ?? 0)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="pt-4 mt-4 border-t space-y-1 text-sm">
                {subtotal !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">סכום ביניים</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                )}
                {discountAmount !== null && discountAmount > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      הנחה{order.discount_code ? ` (${order.discount_code})` : ''}
                    </span>
                    <span>-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {shippingCost !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">משלוח</span>
                    <span>{shippingCost > 0 ? formatCurrency(shippingCost) : 'חינם'}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-lg">סה"כ</span>
                  <span className="font-bold text-lg">{formatCurrency(order.total_price)}</span>
                </div>
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
                  <p className="font-medium">{shippingAddress.full_name ?? '---'}</p>
                  <p>
                    {[shippingAddress.street, shippingAddress.house_number].filter(Boolean).join(' ') || '---'}
                    {shippingAddress.apartment ? `, דירה ${shippingAddress.apartment}` : ''}
                  </p>
                  <p>
                    {shippingAddress.city ?? ''}
                    {shippingAddress.postal_code ? `, מיקוד ${shippingAddress.postal_code}` : ''}
                  </p>
                  {customerPhone && (
                    <p>
                      <span className="text-muted-foreground">טלפון: </span>
                      <a href={`tel:${customerPhone}`} dir="ltr" className="hover:underline">
                        {customerPhone}
                      </a>
                    </p>
                  )}
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
                {customerName ?? '---'}
              </p>
              <p>
                <span className="text-muted-foreground">אימייל: </span>
                {customerEmail ? (
                  <a href={`mailto:${customerEmail}`} dir="ltr" className="break-all hover:underline">
                    {customerEmail}
                  </a>
                ) : (
                  '---'
                )}
              </p>
              <p>
                <span className="text-muted-foreground">טלפון: </span>
                {customerPhone ? (
                  <a href={`tel:${customerPhone}`} dir="ltr" className="hover:underline">
                    {customerPhone}
                  </a>
                ) : (
                  '---'
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {order.user_id ? 'לקוחה רשומה' : 'הזמנת אורחת'}
              </p>
            </CardContent>
          </Card>

          {/* Payment — server-written fields, for reconciling against PayPlus */}
          <Card>
            <CardHeader>
              <CardTitle>תשלום</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <InfoRow label="סטטוס" value={financialStatusLabel(order.financial_status)} />
              <InfoRow label="סטטוס אצל הסולק" value={order.payment_status_raw} ltr />
              <InfoRow label="ספק סליקה" value={order.payment_provider} />
              <InfoRow label="אמצעי תשלום" value={cardLabel || null} ltr />
              <InfoRow label="מספר אישור" value={order.approval_number} ltr />
              <InfoRow label="מזהה עסקה" value={order.provider_transaction_id} ltr />
              <InfoRow label="מזהה דף תשלום" value={order.payment_page_request_uid} ltr />
              <InfoRow label="מספר חשבונית" value={order.invoice_number ?? null} ltr />
              {order.invoice_url && (
                <a
                  href={order.invoice_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm underline text-primary"
                >
                  לצפייה בחשבונית / קבלה
                </a>
              )}
              <InfoRow
                label="סכום ששולם"
                value={paidLabel && order.paid_currency && order.paid_currency !== 'ILS'
                  ? `${paidLabel} (${order.paid_currency})`
                  : paidLabel}
              />
              <InfoRow label="מועד תשלום" value={formatDateTime(order.paid_at)} />
              <InfoRow label="מועד ביטול" value={formatDateTime(order.cancelled_at)} />
              <InfoRow label="מועד זיכוי" value={formatDateTime(order.refunded_at)} />
              <InfoRow label="מייל אישור נשלח" value={formatDateTime(order.confirmation_email_sent_at)} />
              <InfoRow
                label="ניסיונות תשלום"
                value={order.payment_attempts != null ? String(order.payment_attempts) : null}
              />

              {!hasPaymentDetails && (
                <p className="text-muted-foreground">
                  אין עדיין פרטי תשלום להזמנה הזו.
                </p>
              )}

              {order.payment_raw != null && (
                <details className="pt-2">
                  <summary className="cursor-pointer text-xs text-muted-foreground">
                    תשובת הסולק המלאה (לבדיקות)
                  </summary>
                  <pre
                    dir="ltr"
                    className="mt-2 max-h-64 overflow-auto bg-muted p-2 text-xs leading-relaxed"
                  >
                    {JSON.stringify(order.payment_raw, null, 2)}
                  </pre>
                </details>
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
                    {FINANCIAL_STATUS_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
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
                    {FULFILLMENT_STATUS_OPTIONS.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
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
                <Label htmlFor="notes">הערת הלקוחה מההזמנה</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="הלקוחה לא הוסיפה הערה"
                />
                <p className="text-xs text-muted-foreground">
                  זה הטקסט שהלקוחה כתבה בקופה. עריכה כאן משנה אותו — זה לא שדה להערות פנימיות.
                </p>
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
