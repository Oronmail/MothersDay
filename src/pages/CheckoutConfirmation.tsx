import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { supabase } from "@/lib/supabase";
import { Order } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { CheckoutHeader } from "@/components/checkout/CheckoutHeader";
import { CheckCircle, Loader2 } from "lucide-react";
import { LazyImage } from "@/components/LazyImage";

export default function CheckoutConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) return;

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (!error && data) {
        setOrder(data as Order);
      }
      setLoading(false);
    }
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir="rtl">
        <CheckoutHeader />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir="rtl">
        <CheckoutHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">ההזמנה לא נמצאה</p>
            <Button asChild>
              <Link to={ROUTES.home}>חזרה לחנות</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <CheckoutHeader />

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
        <div className="text-center space-y-4 mb-8">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
          <h1 className="text-2xl">ההזמנה התקבלה!</h1>
          <p className="text-muted-foreground">
            מספר הזמנה: <span className="font-medium text-foreground">{order.order_number}</span>
          </p>
        </div>

        {/* Order items */}
        <div className="border border-border p-4 space-y-3 mb-6">
          <h2 className="text-sm text-muted-foreground">פרטי ההזמנה</h2>
          {order.line_items.map((item, index) => (
            <div key={index} className="flex gap-3 items-center">
              <div className="w-12 h-12 bg-muted overflow-hidden flex-shrink-0">
                {item.image && <LazyImage src={item.image} alt={item.title} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">כמות: {item.quantity}</p>
              </div>
              <p className="text-sm">&#8362;{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
            </div>
          ))}
          <div className="border-t border-border pt-3 flex justify-between">
            <span>סה״כ</span>
            <span className="font-medium">&#8362;{order.total_price.toFixed(2)}</span>
          </div>
        </div>

        {/* Shipping address */}
        {order.shipping_address && (
          <div className="border border-border p-4 mb-6">
            <h2 className="text-sm text-muted-foreground mb-2">כתובת למשלוח</h2>
            <p className="text-sm">{order.shipping_address.full_name}</p>
            <p className="text-sm">{order.shipping_address.street}</p>
            <p className="text-sm">{order.shipping_address.city}</p>
            {order.shipping_address.phone && (
              <p className="text-sm">טלפון: {order.shipping_address.phone}</p>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to={ROUTES.home}>המשך לקנות</Link>
          </Button>
          {user && (
            <Button asChild variant="outline">
              <Link to={ROUTES.orders}>צפה בהזמנות שלך</Link>
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
