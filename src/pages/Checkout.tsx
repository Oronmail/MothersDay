import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCartStore } from "@/stores/cartStore";
import { useAuth } from "@/hooks/useAuth";
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
  PAYMENT_SIMULATION_ENABLED,
  PAYMENT_SIMULATION_MESSAGE,
  getOrderAccessStorageKey,
} from "@/lib/checkoutConfig";

const checkoutSchema = z.object({
  email: z.string().email("כתובת אימייל לא תקינה"),
  phone: z
    .string()
    .min(1, "מספר טלפון נדרש")
    .regex(/^0\d{8,9}$/, "מספר טלפון ישראלי לא תקין (10 ספרות, מתחיל ב-0)"),
  full_name: z.string().min(2, "שם מלא נדרש (לפחות 2 תווים)"),
  city: z.string().min(2, "יש לבחור עיר"),
  street: z.string().min(2, "יש לבחור רחוב"),
  house_number: z.string().min(1, "מספר בית נדרש"),
  apartment: z.string().optional(),
  postal_code: z.string().optional(),
  notes: z.string().optional(),
});

export type CheckoutFormValues = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, isLoading, createOrder } = useCartStore();
  const { data: settings } = useStoreSettings();
  const orderInProgress = useRef(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  const subtotal = items.reduce(
    (sum, item) => sum + parseFloat(item.price.amount) * item.quantity,
    0
  );
  const shippingCost = settings?.shipping_enabled
    ? (subtotal >= (settings?.free_shipping_threshold ?? 350) ? 0 : (settings?.shipping_cost ?? 35))
    : 0;

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
    },
  });

  // Redirect to home if cart is empty (but not during order submission)
  useEffect(() => {
    if (items.length === 0 && !orderInProgress.current) {
      navigate(ROUTES.home, { replace: true });
    }
  }, [items.length, navigate]);

  // Pre-fill email when user logs in
  useEffect(() => {
    if (user?.email && !form.getValues("email")) {
      form.setValue("email", user.email);
    }
  }, [user?.email, form]);

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

    try {
      const { orderId, orderNumber, orderAccessToken } = await createOrder(
        email,
        shippingAddress,
        shippingCost,
        user?.id,
        data.notes
      );

      sessionStorage.setItem(getOrderAccessStorageKey(orderId), orderAccessToken);

      toast.success(PAYMENT_SIMULATION_ENABLED ? "הזמנת הדוגמה נוצרה בהצלחה!" : "ההזמנה נוצרה בהצלחה!", {
        description: `מספר הזמנה: ${orderNumber}`,
      });

      if (typeof window.gtag === 'function') {
        window.gtag('event', 'purchase', {
          transaction_id: orderId,
          value: subtotal + shippingCost,
          currency: 'ILS',
          shipping: shippingCost,
          items: items.map(item => ({
            item_id: item.variantId,
            item_name: item.product.node.title,
            price: parseFloat(item.price.amount),
            quantity: item.quantity,
          })),
        });
      }

      if (PAYMENT_SIMULATION_ENABLED) {
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
      }

      navigate(`${ROUTES.checkoutConfirmation}/${orderId}`, { replace: true });
    } catch (error) {
      orderInProgress.current = false;
      setIsSubmittingOrder(false);
      const message =
        error instanceof Error && error.message.includes("network")
          ? "בעיית תקשורת. בדוק את החיבור לאינטרנט"
          : "אנא נסה שנית";

      toast.error("יצירת ההזמנה נכשלה", { description: message });
    }
  });

  if (items.length === 0) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col" dir="rtl">
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
                  isSubmitting={isLoading || isSubmittingOrder}
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
