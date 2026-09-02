import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { ROUTES } from "@/lib/routes";
import { toast } from "sonner";
import { CheckoutHeader } from "@/components/checkout/CheckoutHeader";
import { CheckoutContactForm } from "@/components/checkout/CheckoutContactForm";
import { CheckoutShippingForm } from "@/components/checkout/CheckoutShippingForm";
import { CheckoutPayment } from "@/components/checkout/CheckoutPayment";
import { CheckoutSummary } from "@/components/checkout/CheckoutSummary";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import {
  CAN_SUBMIT_CHECKOUT,
  CHECKOUT_DISABLED_MESSAGE,
  CHECKOUT_ENABLED,
  MAX_ITEM_QUANTITY_MESSAGE,
  PAYMENT_SIMULATION_ENABLED,
  PAYMENT_SIMULATION_MESSAGE,
  getOrderAccessStorageKey,
} from "@/lib/checkoutConfig";
import { CheckoutApiError, createPayment, validateCoupon } from "@/lib/api";
import { cartItemToTracked, trackAddPaymentInfo, trackBeginCheckout } from "@/lib/tracking";

/** Israeli phone numbers are written many ways ("050-123-4567", "050 1234567"). */
const stripPhoneFormatting = (value: string) => value.replace(/[\s().-]/g, "");

const checkoutSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  phone: z
    .string()
    .min(1, "מספר טלפון נדרש")
    .transform(stripPhoneFormatting)
    .refine((value) => /^0\d{8,9}$/.test(value), {
      message: "מספר טלפון ישראלי לא תקין (9-10 ספרות, מתחיל ב-0). אפשר להקליד עם מקפים",
    }),
  full_name: z.string().min(2, "שם מלא נדרש (לפחות 2 תווים)"),
  city: z.string().min(2, "יש לבחור או להקליד עיר"),
  street: z.string().min(2, "יש לבחור או להקליד רחוב"),
  house_number: z.string().min(1, "מספר בית נדרש"),
  apartment: z.string().optional(),
  postal_code: z.string().optional(),
  notes: z.string().optional(),
  terms_accepted: z.boolean().refine((v) => v === true, {
    message: "יש לאשר את תקנון האתר ומדיניות הפרטיות",
  }),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

// Saved phones may be stored in +972 format; the checkout field expects the
// local 0-format. Returns "" when the number can't be shown as a valid value.
function toLocalPhone(raw?: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/[^\d+]/g, "");
  const local = digits.startsWith("+972")
    ? `0${digits.slice(4)}`
    : digits.startsWith("972")
      ? `0${digits.slice(3)}`
      : digits;
  return /^0\d{8,9}$/.test(local) ? local : "";
}

// Saved addresses keep the street as one line ("הרצל 5, דירה 2");
// the checkout form has separate street / house / apartment fields.
function splitStreetLine(line: string): { street: string; house_number: string; apartment: string } {
  let rest = line.trim();
  let apartment = "";
  const aptMatch = rest.match(/,?\s*דירה\s+(\S+)\s*$/);
  if (aptMatch) {
    apartment = aptMatch[1];
    rest = rest.replace(aptMatch[0], "").trim();
  }
  const houseMatch = rest.match(/^(.+?)\s+(\d+\S*)$/);
  if (houseMatch) {
    return { street: houseMatch[1], house_number: houseMatch[2], apartment };
  }
  return { street: rest, house_number: "", apartment };
}

type PaymentNoticeKind = "failed" | "cancelled" | "error";

const PAYMENT_NOTICES: Record<PaymentNoticeKind, { title: string; description: string }> = {
  failed: {
    title: "התשלום לא אושר",
    description:
      "לא בוצע חיוב. אפשר לנסות שוב או להשתמש בכרטיס אחר — הפרטים שמילאת נשמרו בעגלה.",
  },
  cancelled: {
    title: "ביטלת את התשלום",
    description: "לא בוצע חיוב. העגלה שלך מחכה כאן, אפשר להשלים את ההזמנה מתי שנוח לך.",
  },
  error: {
    title: "משהו השתבש בתהליך התשלום",
    description: "לא בוצע חיוב. כדאי לנסות שוב, ואם זה חוזר על עצמו נשמח שתכתבי לנו.",
  },
};

/** Turns a server error from /api/create-order into something a customer can act on. */
function describeOrderError(error: unknown): string {
  const code = error instanceof CheckoutApiError ? error.code : "";
  const message = error instanceof Error ? error.message : "";
  const haystack = `${code} ${message}`.toLowerCase();

  if (haystack.includes("quantity")) {
    return `${MAX_ITEM_QUANTITY_MESSAGE}. יש לעדכן את הכמות בסיכום ההזמנה ולנסות שוב.`;
  }
  if (
    haystack.includes("unavailable") ||
    haystack.includes("not_available") ||
    haystack.includes("out_of_stock") ||
    haystack.includes("item_not_found") ||
    haystack.includes("product_not_found") ||
    haystack.includes("variant")
  ) {
    return "אחד המוצרים בעגלה כבר לא זמין. יש להסיר אותו מסיכום ההזמנה ולנסות שוב.";
  }
  if (
    haystack.includes("network") ||
    haystack.includes("failed to fetch") ||
    haystack.includes("load failed")
  ) {
    return "בעיית תקשורת. כדאי לבדוק את החיבור לאינטרנט ולנסות שוב";
  }
  return "אנא נסי שנית";
}

export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { items, isLoading, createOrder } = useCartStore();
  const { data: settings } = useStoreSettings();
  const orderInProgress = useRef(false);
  const hasSavedAddressRef = useRef(false);
  const beginCheckoutTracked = useRef(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isRedirectingToPayment, setIsRedirectingToPayment] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<PaymentNoticeKind | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; amount: number } | null>(null);
  const appliedCouponRef = useRef(appliedCoupon);
  appliedCouponRef.current = appliedCoupon;

  const paymentParam = searchParams.get("payment");
  // Keeps the empty-cart redirect from bouncing a customer who just came back
  // from PayPlus — the param is cleaned from the URL as soon as it's read.
  const isReturningFromPayment = paymentParam !== null || paymentNotice !== null;

  const subtotal = items.reduce(
    (sum, item) => sum + parseFloat(item.price.amount) * item.quantity,
    0
  );
  // Free-shipping threshold stays on the pre-discount subtotal (the banner's
  // "ברכישה מעל 350" promise) — the server computes it the same way.
  const shippingCost = settings?.shipping_enabled
    ? (subtotal >= (settings?.free_shipping_threshold ?? 350) ? 0 : (settings?.shipping_cost ?? 35))
    : 0;
  const discount = appliedCoupon?.amount ?? 0;

  const itemsForCouponApi = () =>
    items.map((item) => ({
      product_id: item.product.node.id,
      variant_id: item.variantId,
      quantity: item.quantity,
    }));

  const applyCoupon = async (code: string): Promise<string | null> => {
    try {
      const result = await validateCoupon(
        code,
        itemsForCouponApi(),
        form.getValues("email") || undefined
      );
      setAppliedCoupon({ code: result.code, amount: result.discountAmount });
      return null;
    } catch (error) {
      setAppliedCoupon(null);
      return error instanceof CheckoutApiError
        ? error.message
        : "לא הצלחנו לבדוק את הקוד, נסי שוב";
    }
  };

  const removeCoupon = () => setAppliedCoupon(null);

  // The discount depends on the cart contents (bundles are excluded), so a
  // cart change re-validates the applied code and refreshes the amount.
  useEffect(() => {
    const coupon = appliedCouponRef.current;
    if (!coupon) return;
    if (items.length === 0) {
      setAppliedCoupon(null);
      return;
    }
    let cancelled = false;
    validateCoupon(
      coupon.code,
      items.map((item) => ({
        product_id: item.product.node.id,
        variant_id: item.variantId,
        quantity: item.quantity,
      }))
    )
      .then((result) => {
        if (!cancelled) setAppliedCoupon({ code: result.code, amount: result.discountAmount });
      })
      .catch((error) => {
        if (cancelled) return;
        setAppliedCoupon(null);
        toast.error("קוד הקופון הוסר", {
          description:
            error instanceof CheckoutApiError ? error.message : "אפשר להזין אותו שוב",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [items]);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      email: user?.email || "",
      phone: "",
      full_name: "",
      city: "",
      street: "",
      house_number: "",
      apartment: "",
      postal_code: "",
      notes: "",
      terms_accepted: false,
    },
  });

  // Read the payment result PayPlus sent us back with, then drop it from the
  // URL so a refresh doesn't re-show the banner.
  useEffect(() => {
    if (!paymentParam) return;
    setPaymentNotice(
      paymentParam === "failed" || paymentParam === "cancelled" ? paymentParam : "error"
    );
    setSearchParams({}, { replace: true });
  }, [paymentParam, setSearchParams]);

  // Redirect to home if cart is empty (but not during order submission, and
  // never while showing a payment result — that customer deserves an explanation)
  useEffect(() => {
    if (items.length === 0 && !orderInProgress.current && !isReturningFromPayment) {
      navigate(ROUTES.home, { replace: true });
    }
  }, [items.length, navigate, isReturningFromPayment]);

  // Funnel: report checkout entry once per visit to this page
  useEffect(() => {
    if (beginCheckoutTracked.current || items.length === 0) return;
    beginCheckoutTracked.current = true;
    trackBeginCheckout(items.map(cartItemToTracked));
  }, [items]);

  // Pre-fill email when user logs in
  useEffect(() => {
    if (user?.email && !form.getValues("email")) {
      form.setValue("email", user.email);
    }
  }, [user?.email, form]);

  // Recognize returning customers: prefill contact + shipping details from
  // their saved address (or profile), filling empty fields only.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const prefill = async () => {
      const [{ data: address }, { data: profile }] = await Promise.all([
        supabase
          .from("addresses")
          .select("full_name, street, city, postal_code, phone")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (cancelled) return;
      hasSavedAddressRef.current = !!address;

      type PrefillField = "full_name" | "phone" | "city" | "street" | "house_number" | "apartment" | "postal_code";
      const setIfEmpty = (field: PrefillField, value?: string | null) => {
        if (value && !form.getValues(field)) {
          form.setValue(field, value);
        }
      };

      setIfEmpty("full_name", address?.full_name || profile?.full_name);
      setIfEmpty("phone", toLocalPhone(address?.phone || profile?.phone));
      if (address) {
        const { street, house_number, apartment } = splitStreetLine(address.street || "");
        setIfEmpty("city", address.city);
        setIfEmpty("street", street);
        setIfEmpty("house_number", house_number);
        setIfEmpty("apartment", apartment);
        setIfEmpty("postal_code", address.postal_code);
      }
    };

    prefill();
    return () => { cancelled = true; };
  }, [user?.id, form]);

  const handleSubmit = form.handleSubmit(async (data) => {
    if (!CAN_SUBMIT_CHECKOUT) {
      toast.error("הזמנות אונליין עדיין לא פעילות", {
        description: CHECKOUT_DISABLED_MESSAGE,
      });
      return;
    }

    const email = user?.email || data.email;
    orderInProgress.current = true;
    setIsSubmittingOrder(true);
    setPaymentNotice(null);

    const streetFull = data.apartment
      ? `${data.street} ${data.house_number}, דירה ${data.apartment}`
      : `${data.street} ${data.house_number}`;

    const shippingAddress = {
      full_name: data.full_name,
      city: data.city,
      street: streetFull,
      house_number: data.house_number,
      apartment: data.apartment,
      postal_code: data.postal_code,
      phone: data.phone,
    };

    let createdOrder: { orderId: string; orderNumber: number; orderAccessToken: string };
    try {
      createdOrder = await createOrder(
        email,
        shippingAddress,
        shippingCost,
        data.notes,
        appliedCoupon?.code
      );
    } catch (error) {
      orderInProgress.current = false;
      setIsSubmittingOrder(false);
      if (error instanceof CheckoutApiError && error.code === "invalid_coupon") {
        setAppliedCoupon(null);
        toast.error("קוד הקופון לא התקבל", {
          description: `${error.message}. לא נוצרה הזמנה - אפשר לנסות שוב.`,
        });
        return;
      }
      toast.error("יצירת ההזמנה נכשלה", { description: describeOrderError(error) });
      return;
    }

    const { orderId, orderNumber, orderAccessToken } = createdOrder;

    // The confirmation page reads the token back from here when PayPlus
    // returns the customer without it (private-mode storage may refuse).
    try {
      sessionStorage.setItem(getOrderAccessStorageKey(orderId), orderAccessToken);
    } catch {
      // Non-fatal: the payment redirect carries the token in the URL too.
    }

    // Remember the address for the next checkout (first order of a
    // logged-in user without a saved address). Fire-and-forget.
    if (user?.id && !hasSavedAddressRef.current) {
      void supabase
        .from("addresses")
        .insert({
          user_id: user.id,
          label: "בית",
          full_name: data.full_name,
          street: streetFull,
          city: data.city,
          postal_code: data.postal_code || null,
          phone: data.phone,
          is_default: true,
        })
        .then(({ error }) => {
          if (error) console.warn("Failed to save address for future checkouts", error);
        });
    }

    // The GA `purchase` event belongs on the confirmation page — nothing has
    // been paid for yet at this point.

    try {
      if (PAYMENT_SIMULATION_ENABLED) {
        toast.success("הזמנת הדוגמה נוצרה בהצלחה!", {
          description: `מספר הזמנה: ${orderNumber}`,
        });

        const simulationResponse = await fetch("/api/simulate-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });

        if (!simulationResponse.ok) {
          const errorPayload = await simulationResponse
            .json()
            .catch(() => ({ error: "simulation_failed" }));

          toast.error("ההזמנה נוצרה, אבל הדמיית התשלום נכשלה", {
            description: "אפשר לבדוק את אישור ההזמנה, אבל המייל עדיין לא נשלח.",
          });

          console.error("Payment simulation failed:", errorPayload);
          navigate(`${ROUTES.checkoutConfirmation}/${orderId}`, { replace: true });
          return;
        }

        const simulationResult = (await simulationResponse.json()) as {
          confirmationUrl?: string;
          emailSent?: boolean;
          emailError?: string | null;
        };

        if (simulationResult.emailSent === false) {
          toast.warning("ההזמנה עברה בהדמיה, אבל המייל לא נשלח", {
            description: "נבדוק את הגדרות Resend לפני העלייה לאוויר.",
          });
        }

        if (simulationResult.confirmationUrl) {
          window.location.assign(simulationResult.confirmationUrl);
          return;
        }

        navigate(`${ROUTES.checkoutConfirmation}/${orderId}`, { replace: true });
        return;
      }

      // Live checkout: hand the customer over to PayPlus's hosted page.
      setIsRedirectingToPayment(true);
      trackAddPaymentInfo(items.map(cartItemToTracked));
      const { paymentPageUrl } = await createPayment(orderId, orderAccessToken);
      window.location.assign(paymentPageUrl);
    } catch (error) {
      // The order was already paid for (double submit / stale tab) — nothing
      // left to charge, just show the confirmation.
      if (error instanceof CheckoutApiError && error.code === "already_paid") {
        navigate(
          `${ROUTES.checkoutConfirmation}/${orderId}?token=${encodeURIComponent(orderAccessToken)}`,
          { replace: true }
        );
        return;
      }

      orderInProgress.current = false;
      setIsSubmittingOrder(false);
      setIsRedirectingToPayment(false);

      const description =
        error instanceof CheckoutApiError && error.code === "checkout_disabled"
          ? CHECKOUT_DISABLED_MESSAGE
          : `${describeOrderError(error).replace(/\.$/, "")}. ההזמנה שלך נשמרה אצלנו (מספר ${orderNumber}) ולא בוצע חיוב.`;

      toast.error(
        PAYMENT_SIMULATION_ENABLED ? "הדמיית התשלום נכשלה" : "לא הצלחנו לפתוח את עמוד התשלום",
        { description }
      );
    }
  });

  const notice = paymentNotice ? PAYMENT_NOTICES[paymentNotice] : null;

  if (items.length === 0 && !notice) return null;

  const paymentNoticeBanner = notice && (
    <div role="status" className="border border-border bg-muted p-4 space-y-1">
      <p className="text-sm font-medium">{notice.title}</p>
      <p className="text-sm text-muted-foreground">{notice.description}</p>
    </div>
  );

  // A customer can land back here with an emptied cart (e.g. paid in another
  // tab). Explain instead of silently bouncing them to the homepage.
  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col" dir="rtl">
        <SEO title="תשלום" description="עמוד התשלום של יום האם." noindex />
        <CheckoutHeader />
        <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-12 space-y-6">
          {paymentNoticeBanner}
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">העגלה שלך ריקה כרגע.</p>
            <Link to={ROUTES.home} className="underline hover:text-primary">
              חזרה לחנות
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    // pb-40 on mobile keeps the fixed CTA bar (z-40) from covering the footer
    // once the page is scrolled all the way down.
    <div className="min-h-screen bg-background flex flex-col pb-40 md:pb-0" dir="rtl">
      <SEO
        title="תשלום"
        description="עמוד התשלום של יום האם."
        noindex
      />
      <CheckoutHeader />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <FormProvider {...form}>
          <div className="flex flex-col md:flex-row gap-8">
            {/* Right column (RTL main): form sections */}
            <div className="flex-1 space-y-8">
              {paymentNoticeBanner}
              <CheckoutContactForm
                form={form}
                isLoggedIn={!!user}
                userEmail={user?.email}
              />
              <CheckoutShippingForm form={form} />
              <CheckoutPayment
                checkoutEnabled={CHECKOUT_ENABLED}
                paymentSimulationEnabled={PAYMENT_SIMULATION_ENABLED}
              />
              {PAYMENT_SIMULATION_ENABLED && (
                <p className="text-sm text-muted-foreground">
                  {PAYMENT_SIMULATION_MESSAGE}
                </p>
              )}
            </div>

            {/* Left column (RTL sidebar): order summary */}
            <div className="w-full md:w-[360px] flex-shrink-0">
              <div className="md:sticky md:top-8">
                <CheckoutSummary
                  items={items}
                  subtotal={subtotal}
                  shippingCost={shippingCost}
                  appliedCouponCode={appliedCoupon?.code ?? null}
                  discount={discount}
                  onApplyCoupon={applyCoupon}
                  onRemoveCoupon={removeCoupon}
                  isSubmitting={isLoading || isSubmittingOrder}
                  isRedirectingToPayment={isRedirectingToPayment}
                  checkoutEnabled={CHECKOUT_ENABLED}
                  paymentSimulationEnabled={PAYMENT_SIMULATION_ENABLED}
                  onSubmit={handleSubmit}
                />
              </div>
            </div>
          </div>
        </FormProvider>
      </main>

      <Footer />
    </div>
  );
}
