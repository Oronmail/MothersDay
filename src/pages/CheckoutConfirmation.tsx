import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/routes";
import { Order } from "@/lib/types";
import { useAuth } from "@/hooks/useAuth";
import { useCartStore } from "@/stores/cartStore";
import { trackPurchase } from "@/lib/tracking";
import { CheckoutHeader } from "@/components/checkout/CheckoutHeader";
import { Footer } from "@/components/Footer";
import { AlertCircle, CheckCircle, Clock, Loader2, XCircle } from "lucide-react";
import { LazyImage } from "@/components/LazyImage";
import { SEO } from "@/components/SEO";
import {
  getOrderAccessStorageKey,
  getPurchaseEventStorageKey,
  PAYMENT_SIMULATION_ENABLED,
} from "@/lib/checkoutConfig";
import { SUPPORT_EMAIL } from "@/lib/siteConfig";
import { getProductThumbnailImageUrl } from "@/lib/imageTransforms";

/**
 * PayPlus can send the customer back a moment before its server-to-server
 * callback lands, so a freshly returned order may still read as `pending`.
 */
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 20000;

type FinancialStatus = "pending" | "paid" | "failed" | "cancelled" | "refunded";

/** `/api/get-order` returns payment details on top of the stored order row. */
type ConfirmationOrder = Omit<Order, "financial_status"> & {
  financial_status: FinancialStatus;
  discount_code?: string | null;
  discount_amount?: number;
  paid_at?: string | null;
  payment_method?: string | null;
  payment_card_last4?: string | null;
  payment_card_brand?: string | null;
  invoice_number?: string | null;
  invoice_url?: string | null;
};

type LoadState = "loading" | "ready" | "not_found" | "network_error" | "no_token";

function readStoredToken(orderId?: string): string | null {
  if (!orderId) return null;
  try {
    return sessionStorage.getItem(getOrderAccessStorageKey(orderId));
  } catch {
    return null;
  }
}

export default function CheckoutConfirmation() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<ConfirmationOrder | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [verificationTimedOut, setVerificationTimedOut] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const handledPaidOrderRef = useRef(false);

  const tokenFromUrl = searchParams.get("token");
  const storedToken = useMemo(() => readStoredToken(orderId), [orderId]);

  useEffect(() => {
    if (orderId && tokenFromUrl) {
      try {
        sessionStorage.setItem(getOrderAccessStorageKey(orderId), tokenFromUrl);
      } catch {
        // Private-mode storage: the token stays in the URL for this page load.
      }
    }
  }, [orderId, tokenFromUrl]);

  useEffect(() => {
    if (!orderId) {
      setLoadState("not_found");
      return;
    }

    const accessToken = tokenFromUrl || storedToken;
    if (!accessToken) {
      setLoadState("no_token");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = Date.now() + POLL_TIMEOUT_MS;

    const schedulePoll = () => {
      timer = setTimeout(() => void load(true), POLL_INTERVAL_MS);
    };

    const load = async (isPoll: boolean) => {
      try {
        const params = new URLSearchParams({ id: orderId, token: accessToken });
        const response = await fetch(`/api/get-order?${params.toString()}`);
        if (cancelled) return;

        // A genuine "no such order" (or a token that doesn't match it) is a
        // different story from the network being flaky — say so honestly.
        if (response.status === 404 || response.status === 401 || response.status === 403) {
          setLoadState("not_found");
          return;
        }

        if (!response.ok) {
          if (isPoll) {
            if (Date.now() < deadline) schedulePoll();
            else setVerificationTimedOut(true);
            return;
          }
          setLoadState("network_error");
          return;
        }

        const data = (await response.json()) as ConfirmationOrder;
        if (cancelled) return;

        setOrder(data);
        setLoadState("ready");

        if (data.financial_status === "pending") {
          if (Date.now() < deadline) schedulePoll();
          else setVerificationTimedOut(true);
        }
      } catch {
        if (cancelled) return;
        if (isPoll) {
          if (Date.now() < deadline) schedulePoll();
          else setVerificationTimedOut(true);
          return;
        }
        setLoadState("network_error");
      }
    };

    void load(false);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderId, storedToken, tokenFromUrl, retryCount]);

  const retry = useCallback(() => {
    setLoadState("loading");
    setVerificationTimedOut(false);
    setRetryCount((count) => count + 1);
  }, []);

  // Only a confirmed payment empties the cart and reports the sale, and only
  // the first time — a refresh must not double-count the order or wipe a cart
  // the customer has since started filling again.
  useEffect(() => {
    if (!orderId || order?.financial_status !== "paid") return;
    if (handledPaidOrderRef.current) return;
    handledPaidOrderRef.current = true;

    const storageKey = getPurchaseEventStorageKey(orderId);
    let alreadyHandled = false;
    try {
      alreadyHandled = sessionStorage.getItem(storageKey) !== null;
      if (!alreadyHandled) sessionStorage.setItem(storageKey, "1");
    } catch {
      // Storage unavailable — handle once for this page load.
    }
    if (alreadyHandled) return;

    useCartStore.getState().clearCart();

    trackPurchase({
      orderId,
      value: order.total_price,
      currency: order.currency_code,
      shipping: order.shipping_cost,
      coupon: order.discount_code ?? null,
      items: order.line_items.map((item) => ({
        item_id: item.variant_id,
        item_name: item.title,
        price: parseFloat(item.price),
        quantity: item.quantity,
      })),
    });
  }, [order, orderId]);

  if (loadState === "loading") {
    return (
      <Shell>
        <div className="flex-1 flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Shell>
    );
  }

  if (loadState === "network_error") {
    return (
      <Shell>
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center space-y-4 max-w-md px-4">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
            <h1 className="text-xl">לא הצלחנו לטעון את פרטי ההזמנה</h1>
            <p className="text-sm text-muted-foreground">
              נראה שיש בעיית תקשורת. ההזמנה שלך לא הלכה לשום מקום — אפשר לנסות שוב.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button onClick={retry}>נסי שוב</Button>
              <Button asChild variant="outline">
                <Link to={ROUTES.home}>חזרה לחנות</Link>
              </Button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (loadState === "no_token") {
    return (
      <Shell>
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center space-y-4 max-w-md px-4">
            <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
            <h1 className="text-xl">אין לנו הרשאה להציג את ההזמנה הזו</h1>
            <p className="text-sm text-muted-foreground">
              כדי לצפות בפרטי ההזמנה יש להשתמש בקישור שקיבלת במייל האישור. אם את
              מחוברת לחשבון, ההזמנות שלך מחכות לך באזור האישי.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild variant="outline">
                <Link to={ROUTES.orders}>ההזמנות שלי</Link>
              </Button>
              <Button asChild>
                <Link to={ROUTES.home}>חזרה לחנות</Link>
              </Button>
            </div>
          </div>
        </div>
      </Shell>
    );
  }

  if (!order) {
    return (
      <Shell>
        <div className="flex-1 flex items-center justify-center py-20">
          <div className="text-center space-y-4 px-4">
            <p className="text-muted-foreground">ההזמנה לא נמצאה</p>
            <Button asChild>
              <Link to={ROUTES.home}>חזרה לחנות</Link>
            </Button>
          </div>
        </div>
      </Shell>
    );
  }

  const itemsSubtotal = order.line_items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );
  const shippingCost = order.shipping_cost ?? 0;
  const discountAmount = Number(order.discount_amount ?? 0);
  const isPaid = order.financial_status === "paid";
  const isPending = order.financial_status === "pending";
  const didNotGoThrough =
    order.financial_status === "failed" || order.financial_status === "cancelled";

  const cardLast4 = order.payment_card_last4?.trim();
  const cardBrand = order.payment_card_brand?.trim();
  const paymentLine = cardLast4
    ? `שולם ב${cardBrand ? `כרטיס ${cardBrand}` : "כרטיס"} המסתיים ב-${cardLast4}`
    : order.payment_method?.trim()
      ? `אמצעי תשלום: ${order.payment_method.trim()}`
      : null;

  return (
    <Shell>
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12">
        <div className="text-center space-y-4 mb-8">
          {isPaid && <CheckCircle className="h-16 w-16 text-primary mx-auto" />}
          {isPending && !verificationTimedOut && (
            <Loader2 className="h-16 w-16 animate-spin text-muted-foreground mx-auto" />
          )}
          {isPending && verificationTimedOut && (
            <Clock className="h-16 w-16 text-muted-foreground mx-auto" />
          )}
          {didNotGoThrough && <XCircle className="h-16 w-16 text-muted-foreground mx-auto" />}
          {order.financial_status === "refunded" && (
            <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto" />
          )}

          <h1 className="text-2xl">
            {isPaid && "ההזמנה התקבלה!"}
            {isPending && !verificationTimedOut && "מאמתים את התשלום..."}
            {isPending && verificationTimedOut && "התשלום עדיין בבדיקה"}
            {order.financial_status === "failed" && "התשלום לא אושר"}
            {order.financial_status === "cancelled" && "התשלום בוטל"}
            {order.financial_status === "refunded" && "ההזמנה זוכתה"}
          </h1>

          <p className="text-muted-foreground">
            מספר הזמנה:{" "}
            <span className="font-medium text-foreground">{order.order_number}</span>
          </p>

          {isPaid && paymentLine && (
            <p className="text-sm text-muted-foreground">{paymentLine}</p>
          )}
          {isPaid && order.invoice_url && (
            <p className="text-sm">
              <a
                href={order.invoice_url}
                target="_blank"
                rel="noreferrer"
                className="underline text-muted-foreground hover:text-foreground"
              >
                לצפייה בחשבונית / קבלה
              </a>
            </p>
          )}

          {isPaid && (
            <p className="text-sm text-muted-foreground">
              שלחנו לך מייל עם אישור ההזמנה. תודה שבחרת בנו!
            </p>
          )}

          {isPending && !verificationTimedOut && (
            <p className="text-sm text-muted-foreground" role="status">
              רק רגע — אנחנו מקבלים את האישור מחברת הסליקה. אין צורך לרענן את הדף.
            </p>
          )}

          {isPending && verificationTimedOut && (
            <div className="text-sm text-muted-foreground space-y-2" role="status">
              <p>
                האישור מחברת הסליקה עדיין לא הגיע אלינו. שמרנו את ההזמנה שלך (מספר{" "}
                {order.order_number}) ואנחנו עוקבים אחריה — ברגע שהתשלום יאושר יישלח
                אלייך מייל.
              </p>
              <p>
                כדאי לא לשלם שוב. אם יש שאלה, אפשר לכתוב לנו ל־
                <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-foreground">
                  {SUPPORT_EMAIL}
                </a>{" "}
                עם מספר ההזמנה.
              </p>
              <Button onClick={retry} variant="outline" size="sm">
                בדקי שוב
              </Button>
            </div>
          )}

          {didNotGoThrough && (
            <p className="text-sm text-muted-foreground">
              לא בוצע חיוב. שמרנו את פרטי ההזמנה — אפשר לחזור לתשלום ולנסות שוב, גם
              בכרטיס אחר.
            </p>
          )}

          {order.financial_status === "refunded" && (
            <p className="text-sm text-muted-foreground">
              הזיכוי בוצע. אם יש שאלה, נשמח שתכתבי לנו ל־
              <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-foreground">
                {SUPPORT_EMAIL}
              </a>
              .
            </p>
          )}

          {isPaid && PAYMENT_SIMULATION_ENABLED && (
            <p className="text-sm text-muted-foreground">
              הזמנה זו נוצרה במסלול בדיקה. לא בוצע חיוב בפועל.
            </p>
          )}
        </div>

        {/* Order items */}
        <div className="border border-border p-4 space-y-3 mb-6">
          <h2 className="text-sm text-muted-foreground">פרטי ההזמנה</h2>
          {order.line_items.map((item, index) => (
            <div key={index} className="flex gap-3 items-center">
              <div className="w-12 h-12 bg-muted overflow-hidden flex-shrink-0">
                {item.image && (
                  <LazyImage
                    src={getProductThumbnailImageUrl(item.image)}
                    alt={item.title}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">כמות: {item.quantity}</p>
              </div>
              <p className="text-sm">&#8362;{(parseFloat(item.price) * item.quantity).toFixed(2)}</p>
            </div>
          ))}
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">סכום ביניים</span>
              <span>&#8362;{itemsSubtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  הנחה{order.discount_code ? ` (${order.discount_code})` : ""}
                </span>
                <span>&#8722;&#8362;{discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">משלוח</span>
              <span>{shippingCost === 0 ? "חינם" : `₪${shippingCost.toFixed(2)}`}</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between">
              <span>סה״כ</span>
              <span className="font-medium">&#8362;{order.total_price.toFixed(2)}</span>
            </div>
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
          {didNotGoThrough ? (
            <>
              <Button asChild>
                <Link to={ROUTES.checkout}>חזרה לתשלום</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={ROUTES.home}>חזרה לחנות</Link>
              </Button>
            </>
          ) : (
            <>
              <Button asChild>
                <Link to={ROUTES.home}>המשך לקנות</Link>
              </Button>
              {user && (
                <Button asChild variant="outline">
                  <Link to={ROUTES.orders}>צפה בהזמנות שלך</Link>
                </Button>
              )}
            </>
          )}
        </div>
      </main>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
      <SEO title="אישור הזמנה" description="אישור הזמנה של יום האם." noindex />
      <CheckoutHeader />
      {children}
      <Footer />
    </div>
  );
}
