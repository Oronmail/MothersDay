import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Lock, Loader2, Minus, Plus, Trash2 } from "lucide-react";

import { CartItem } from "@/lib/types";
import { LazyImage } from "@/components/LazyImage";
import { useCartStore } from "@/stores/cartStore";

interface CheckoutSummaryProps {
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  isSubmitting: boolean;
  checkoutEnabled: boolean;
  onSubmit: () => void;
}

export function CheckoutSummary({
  items,
  subtotal,
  shippingCost,
  isSubmitting,
  checkoutEnabled,
  onSubmit,
}: CheckoutSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const totalPrice = subtotal + shippingCost;

  return (
    <div className="space-y-4">
      {/* Mobile: collapsible summary bar */}
      <button
        type="button"
        className="md:hidden w-full flex items-center justify-between p-3 bg-muted/50 border border-border"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-sm">
          {isExpanded ? "הסתר פרטים" : "הצג פרטים"}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-medium">&#8362;{totalPrice.toFixed(2)}</span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Items list — always visible on desktop, collapsible on mobile */}
      <div className={`space-y-3 ${isExpanded ? "block" : "hidden md:block"}`}>
        <h2 className="text-lg hidden md:block">סיכום הזמנה</h2>

        {items.map((item) => (
          <div key={item.variantId} className="flex gap-3 border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
            <div className="w-14 h-14 bg-muted overflow-hidden flex-shrink-0 relative">
              {item.product.node.images?.edges?.[0]?.node && (
                <LazyImage
                  src={item.product.node.images.edges[0].node.url}
                  alt={item.product.node.title}
                />
              )}
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 flex items-center justify-center">
                {item.quantity}
              </span>
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm truncate">{item.product.node.title}</p>
                  {item.selectedOptions.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {item.selectedOptions.map((o) => o.value).join(" / ")}
                    </p>
                  )}
                </div>
                <p className="text-sm flex-shrink-0">
                  &#8362;{(parseFloat(item.price.amount) * item.quantity).toFixed(2)}
                </p>
              </div>

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => removeItem(item.variantId)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={`הסירי את ${item.product.node.title} מהעגלה`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <div className="flex items-center border border-border h-8">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                    className="w-8 h-full flex items-center justify-center text-foreground hover:bg-secondary/50 transition-colors"
                    aria-label={`הפחיתי כמות עבור ${item.product.node.title}`}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                    className="w-8 h-full flex items-center justify-center text-foreground hover:bg-secondary/50 transition-colors"
                    aria-label={`הגדילי כמות עבור ${item.product.node.title}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">סכום ביניים</span>
            <span>&#8362;{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">משלוח</span>
            <span>{shippingCost === 0 ? 'חינם' : <>{'\u20AA'}{shippingCost.toFixed(2)}</>}</span>
          </div>
          <div className="flex justify-between text-lg pt-2 border-t border-border">
            <span>סה״כ</span>
            <span>&#8362;{totalPrice.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* CTA button — sticky on mobile */}
      <div className="md:relative fixed bottom-0 left-0 right-0 md:bottom-auto md:left-auto md:right-auto bg-background md:bg-transparent p-4 md:p-0 border-t md:border-t-0 border-border z-40 space-y-2">
        <Button
          type="button"
          onClick={onSubmit}
          className="w-full"
          size="lg"
          disabled={items.length === 0 || isSubmitting || !checkoutEnabled}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              יוצר הזמנה...
            </>
          ) : !checkoutEnabled ? (
            <>הזמנות אונליין ייפתחו בקרוב</>
          ) : (
            <>אישור ותשלום — &#8362;{totalPrice.toFixed(2)}</>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          תשלום מאובטח ומוצפן
        </p>
      </div>

      {/* Spacer for fixed bottom bar on mobile */}
      <div className="h-24 md:hidden" />
    </div>
  );
}
