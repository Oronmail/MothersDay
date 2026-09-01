import { Lock } from "lucide-react";

interface CheckoutPaymentProps {
  /** Whether checkout is live */
  checkoutEnabled?: boolean;
  /** Whether a fake payment flow is enabled for testing */
  paymentSimulationEnabled?: boolean;
}

/**
 * Payment happens on PayPlus's hosted page after submit, so when checkout is
 * live this section renders nothing (per Eden/Oron, 2026-09-01) — the order
 * button and its secure-payment note live in the summary column. The section
 * only appears for the dev simulation mode and for the pre-launch
 * checkout-disabled notice.
 */
export function CheckoutPayment({
  checkoutEnabled = false,
  paymentSimulationEnabled = false,
}: CheckoutPaymentProps) {
  if (checkoutEnabled && !paymentSimulationEnabled) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg">תשלום</h2>

      <div className="border border-border p-4">
        <div className="flex items-start gap-2">
          <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            {paymentSimulationEnabled
              ? "הדמיית תשלום פעילה: לחיצה על כפתור ההזמנה תדמה רכישה מלאה לצורכי בדיקה בלבד, כולל אישור הזמנה ומייל. לא יבוצע חיוב."
              : "הזמנות אונליין עדיין לא פעילות. אפשר להמשיך לעיין בחנות, אבל עדיין לא ניתן להשלים הזמנה."}
          </p>
        </div>
      </div>
    </section>
  );
}
