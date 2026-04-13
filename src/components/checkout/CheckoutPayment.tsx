import { Lock } from "lucide-react";

export function CheckoutPayment() {
  return (
    <section className="space-y-4">
      <h2 className="text-lg">תשלום</h2>

      {/* Payment method tabs — placeholder for Hyp integration */}
      <div className="flex gap-2 border-b border-border">
        <button className="px-4 py-2 text-sm border-b-2 border-primary text-foreground">
          כרטיס אשראי
        </button>
        <button className="px-4 py-2 text-sm text-muted-foreground" disabled>
          Apple Pay
        </button>
        <button className="px-4 py-2 text-sm text-muted-foreground" disabled>
          Bit
        </button>
      </div>

      {/* Placeholder for Hyp iframe */}
      <div className="border border-dashed border-border p-8 flex flex-col items-center justify-center gap-3 bg-muted/30">
        <Lock className="h-6 w-6 text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center">
          טופס תשלום מאובטח
        </p>
        <p className="text-xs text-muted-foreground text-center">
          אזור זה יכיל את טופס התשלום של Hyp
        </p>
      </div>

      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        תשלום מאובטח ומוצפן
      </p>
    </section>
  );
}
