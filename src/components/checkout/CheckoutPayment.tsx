import { Lock } from "lucide-react";

interface CheckoutPaymentProps {
  /** Whether checkout is live */
  checkoutEnabled?: boolean;
  /** Whether a fake payment flow is enabled for testing */
  paymentSimulationEnabled?: boolean;
}

/**
 * The payment step is completed on PayPlus's hosted page, not here — this
 * section only tells the customer what to expect before the redirect.
 */
export function CheckoutPayment({
  checkoutEnabled = false,
  paymentSimulationEnabled = false,
}: CheckoutPaymentProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg">תשלום</h2>

      <div className="border border-border p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-sm text-muted-foreground">
            {paymentSimulationEnabled
              ? "הדמיית תשלום פעילה: לחיצה על כפתור ההזמנה תדמה רכישה מלאה לצורכי בדיקה בלבד, כולל אישור הזמנה ומייל. לא יבוצע חיוב."
              : checkoutEnabled
                ? "לאחר לחיצה על כפתור ההזמנה נעביר אותך לעמוד התשלום המאובטח של PayPlus להשלמת התשלום, ומיד אחר כך תחזרי לאישור ההזמנה."
                : "הזמנות אונליין עדיין לא פעילות. אפשר להמשיך לעיין בחנות, אבל עדיין לא ניתן להשלים הזמנה."}
          </p>
        </div>

        {!paymentSimulationEnabled && (
          <p className="text-xs text-muted-foreground">
            אמצעי תשלום: כרטיסי אשראי ויזה, מאסטרקארד, אמריקן אקספרס ודיינרס.
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        {paymentSimulationEnabled
          ? "הדמיית תשלום מאובטחת לצורכי בדיקה בלבד"
          : "תשלום מאובטח ומוצפן"}
      </p>
    </section>
  );
}
