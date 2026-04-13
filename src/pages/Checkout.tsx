import { useEffect } from "react";
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

  // Redirect to home if cart is empty
  useEffect(() => {
    if (items.length === 0) {
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
    const email = user?.email || data.email;

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
      const { orderId, orderNumber } = await createOrder(email, shippingAddress, user?.id);

      toast.success("ההזמנה נוצרה בהצלחה!", {
        description: `מספר הזמנה: ${orderNumber}`,
      });

      navigate(`${ROUTES.checkoutConfirmation}/${orderId}`, { replace: true });
    } catch (error) {
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
              <CheckoutPayment />
            </div>

            {/* Left column (RTL sidebar): order summary */}
            <div className="w-full md:w-[360px] flex-shrink-0">
              <div className="md:sticky md:top-8">
                <CheckoutSummary
                  items={items}
                  isSubmitting={isLoading}
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
