import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package, Calendar, CreditCard, Truck } from "lucide-react";
import { ROUTES } from "@/lib/routes";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { format } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { LazyImage } from "@/components/LazyImage";
import type { Order as OrderType, OrderLineItem, ShippingAddress as OrderShippingAddress } from "@/lib/types";
import { getProductThumbnailImageUrl } from "@/lib/imageTransforms";

// Type helper to validate JSON structure
function isOrderLineItem(item: unknown): item is OrderLineItem {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.title === 'string' &&
    typeof obj.quantity === 'number' &&
    typeof obj.price === 'string'
  );
}

function isShippingAddress(addr: unknown): addr is OrderShippingAddress {
  if (typeof addr !== 'object' || addr === null) return false;
  return true; // All fields are optional
}

interface Order {
  id: string;
  order_number: number;
  user_id: string | null;
  guest_email: string | null;
  line_items: OrderLineItem[];
  /** true when the stored line_items didn't match the expected shape */
  itemsUnavailable: boolean;
  shipping_address: OrderShippingAddress | null;
  total_price: number;
  currency_code: string;
  financial_status: string;
  fulfillment_status: string;
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Hebrew labels for every status the orders table can hold. An unknown value shows
// "בעיבוד" rather than leaking the raw English word to the customer.
const FINANCIAL_STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין לתשלום',
  paid: 'שולם',
  failed: 'התשלום נכשל',
  cancelled: 'בוטלה',
  refunded: 'הוחזר',
};

const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  unfulfilled: 'בהכנה',
  shipped: 'נשלחה',
  delivered: 'נמסרה',
};

const financialStatusLabel = (status?: string | null) =>
  (status && FINANCIAL_STATUS_LABELS[status]) || 'בעיבוד';

const fulfillmentStatusLabel = (status?: string | null) =>
  (status && FULFILLMENT_STATUS_LABELS[status]) || 'בעיבוד';

const formatPrice = (value: number | string | null | undefined) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `₪${(Number.isFinite(num as number) ? (num as number) : 0).toFixed(2)}`;
};

const Orders = () => {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadOrders = async () => {
      if (authLoading) return;
      
      if (!user) {
        navigate(ROUTES.auth);
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "שגיאה בטעינת ההזמנות",
          description: "לא הצלחנו לטעון את היסטוריית ההזמנות. נסי לרענן את העמוד.",
          variant: "destructive",
        });
      } else {
        // Safely parse and validate the JSON types. An order whose line_items fail
        // validation is still shown — it exists, and hiding it just makes the
        // customer think her order vanished.
        const typedOrders: Order[] = (data || []).map(order => {
          // Parse line_items
          const rawItems = Array.isArray(order.line_items) ? (order.line_items as unknown[]) : [];
          const lineItems = rawItems.filter(isOrderLineItem);

          // Parse shipping_address
          let shippingAddress: OrderShippingAddress | null = null;
          if (order.shipping_address && isShippingAddress(order.shipping_address)) {
            shippingAddress = order.shipping_address as OrderShippingAddress;
          }

          return {
            ...order,
            line_items: lineItems,
            itemsUnavailable: lineItems.length === 0,
            shipping_address: shippingAddress,
          };
        });

        setOrders(typedOrders);
      }

      setLoading(false);
    };

    loadOrders();
  }, [user, authLoading, navigate, toast]);

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || '';
    if (statusLower === 'pending' || statusLower === 'unfulfilled') return 'bg-yellow-500';
    if (statusLower === 'paid' || statusLower === 'delivered') return 'bg-green-500';
    if (statusLower === 'cancelled' || statusLower === 'refunded' || statusLower === 'failed') return 'bg-red-500';
    return 'bg-muted';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-2 mb-6" dir="rtl">
            <Package className="h-6 w-6 text-primary" />
            <h1 className="text-2xl">היסטוריית הזמנות</h1>
            {orders.length > 0 && (
              <span className="text-muted-foreground">({orders.length})</span>
            )}
          </div>

          {orders.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12" dir="rtl">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center mb-2">
                  אין הזמנות עדיין
                </p>
                <p className="text-sm text-muted-foreground text-center">
                  היסטוריית ההזמנות שלך תופיע כאן לאחר ביצוע רכישה
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between" dir="rtl">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">
                          הזמנה #{order.order_number}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(order.created_at), 'dd/MM/yyyy')}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge className={getStatusColor(order.financial_status)}>
                          {financialStatusLabel(order.financial_status)}
                        </Badge>
                        {order.fulfillment_status && (
                          <Badge variant="outline">
                            {fulfillmentStatusLabel(order.fulfillment_status)}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Order Items */}
                    <div className="space-y-2">
                      {order.itemsUnavailable && (
                        <p className="text-sm text-muted-foreground" dir="rtl">
                          לא הצלחנו להציג את פירוט הפריטים בהזמנה הזו. לפרטים אפשר לפנות אלינו
                          עם מספר ההזמנה.
                        </p>
                      )}
                      {order.line_items?.map((item, index) => (
                        <div key={index} className="flex items-center gap-4 py-2">
                          <div className="w-16 h-16 bg-secondary/20 rounded-md overflow-hidden flex-shrink-0">
                            {item.image ? (
                              <LazyImage
                                src={getProductThumbnailImageUrl(item.image)}
                                alt={item.title}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0" dir="rtl">
                            <p className="font-medium truncate">{item.title}</p>
                            <p className="text-sm text-muted-foreground">
                              כמות: {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="">{formatPrice(item.price)}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Summary */}
                    <div className="border-t pt-4" dir="rtl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            סטטוס תשלום
                          </span>
                        </div>
                        <Badge variant={order.financial_status === 'paid' ? 'default' : 'secondary'}>
                          {financialStatusLabel(order.financial_status)}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">סטטוס משלוח</span>
                        </div>
                        <Badge variant="outline">
                          {fulfillmentStatusLabel(order.fulfillment_status)}
                        </Badge>
                      </div>

                      {order.tracking_number &&
                        (order.fulfillment_status === 'shipped' || order.fulfillment_status === 'delivered') && (
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">מספר מעקב</span>
                          <span className="text-sm font-medium" dir="ltr">{order.tracking_number}</span>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2">
                        <span className="">סה"כ</span>
                        <span className="text-xl">
                          {formatPrice(order.total_price)}
                        </span>
                      </div>
                    </div>

                    {/* Shipping Address */}
                    {order.shipping_address && (
                      <div className="border-t pt-4" dir="rtl">
                        <p className="text-sm font-medium mb-1">כתובת למשלוח</p>
                        <p className="text-sm text-muted-foreground">
                          {order.shipping_address.full_name}
                          <br />
                          {order.shipping_address.street}
                          <br />
                          {order.shipping_address.city}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Orders;
