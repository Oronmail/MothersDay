import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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

export default function Checkout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, isLoading, createOrder } = useCartStore();
  const { data: settings } = useStoreSettings();
  const orderInProgress = useRef(false);
  const hasSavedAddressRef = useRef(false);
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
      terms_accepted: false,
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
