import { Lock, Loader2 } from "lucide-react";

interface CheckoutPaymentProps {
  /** URL from Hyp's doDeal response (mpiHostedPageUrl). When set, renders the payment iframe. */
  paymentPageUrl?: string;
  /** Whether the payment page URL is being fetched from the server */
  isLoadingPayment?: boolean;
}

export function CheckoutPayment({ paymentPageUrl, isLoadingPayment }: CheckoutPaymentProps) {
  return (
    <section className="space-y-4">
      <h2 className="text-lg">תשלום</h2>

      {/* Payment method tabs — Apple Pay and Bit are enabled in Hyp terminal settings */}
      <div className="flex gap-2 border-b border-border">
        <button className="px-4 py-2 text-sm border-b-2 border-primary text-foreground">
          כרטיס אשראי
        </button>
        <button className="px-4 py-2 text-sm text-muted-foreground cursor-not-allowed" disabled>
          Apple Pay
        </button>
        <button className="px-4 py-2 text-sm text-muted-foreground cursor-not-allowed" disabled>
          Bit
        </button>
      </div>

      {/* Hyp payment iframe or placeholder */}
      {paymentPageUrl ? (
        <iframe
          src={paymentPageUrl}
          className="w-full border-0"
          style={{ height: "400px" }}
          allow="payment"
          title="טופס תשלום מאובטח"
        />
      ) : isLoadingPayment ? (
        <div className="border border-border p-8 flex flex-col items-center justify-center gap-3 bg-muted/30">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            טוען טופס תשלום...
          </p>
        </div>
      ) : (
        <div className="border border-dashed border-border p-8 flex flex-col items-center justify-center gap-3 bg-muted/30">
          <Lock className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            טופס תשלום מאובטח
          </p>
          <p className="text-xs text-muted-foreground text-center">
            טופס התשלום יופיע לאחר מילוי פרטי המשלוח
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        תשלום מאובטח ומוצפן
      </p>
    </section>
  );
}
