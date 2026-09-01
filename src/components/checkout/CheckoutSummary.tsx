import { useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, Lock, Loader2, Minus, Plus, Trash2 } from "lucide-react";
import { ROUTES } from "@/lib/routes";

import { CartItem } from "@/lib/types";
import { LazyImage } from "@/components/LazyImage";
import { useCartStore } from "@/stores/cartStore";
import { getProductThumbnailImageUrl } from "@/lib/imageTransforms";
import { MAX_ITEM_QUANTITY, MAX_ITEM_QUANTITY_MESSAGE } from "@/lib/checkoutConfig";

interface CheckoutSummaryProps {
  items: CartItem[];
  subtotal: number;
  shippingCost: number;
  isSubmitting: boolean;
  /** True while the browser is being handed over to the PayPlus payment page */
  isRedirectingToPayment?: boolean;
  checkoutEnabled: boolean;
  paymentSimulationEnabled?: boolean;
  onSubmit: () => void;
}

export function CheckoutSummary({
  items,
  subtotal,
  shippingCost,
  isSubmitting,
  isRedirectingToPayment = false,
  checkoutEnabled,
  paymentSimulationEnabled = false,
  onSubmit,
}: CheckoutSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { control, formState } = useFormContext();
  const termsError = formState.errors.terms_accepted?.message as string | undefined;
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);

  const totalPrice = subtotal + shippingCost;

  const canSubmit = checkoutEnabled || paymentSimulationEnabled;

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
                  src={getProductThumbnailImageUrl(item.product.node.images.edges[0].node.url)}
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
                    disabled={item.quantity >= MAX_ITEM_QUANTITY}
                    title={item.quantity >= MAX_ITEM_QUANTITY ? MAX_ITEM_QUANTITY_MESSAGE : undefined}
                    className="w-8 h-full flex items-center justify-center text-foreground hover:bg-secondary/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    aria-label={
                      item.quantity >= MAX_ITEM_QUANTITY
                        ? MAX_ITEM_QUANTITY_MESSAGE
                        : `הגדילי כמות עבור ${item.product.node.title}`
                    }
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
        {/* Terms consent — must be given before an order can be placed */}
        <div className="space-y-1">
          <div className="flex items-start gap-2">
            <Controller
              name="terms_accepted"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="terms_accepted"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  onBlur={field.onBlur}
                  aria-invalid={!!termsError}
                  aria-describedby={termsError ? "terms_accepted-error" : undefined}
                  className="mt-0.5 flex-shrink-0"
                />
              )}
            />
            <label htmlFor="terms_accepted" className="text-xs leading-relaxed cursor-pointer">
              קראתי ואני מאשרת את{" "}
              <Link to={ROUTES.terms} target="_blank" className="underline hover:text-primary">
                תקנון האתר
              </Link>{" "}
              ואת{" "}
              <Link to={ROUTES.privacy} target="_blank" className="underline hover:text-primary">
                מדיניות הפרטיות
              </Link>
            </label>
          </div>
          {termsError && (
            <p id="terms_accepted-error" className="text-xs text-destructive">
              {termsError}
            </p>
          )}
        </div>

        <Button
          type="button"
          onClick={onSubmit}
          className="w-full"
          size="lg"
          disabled={items.length === 0 || isSubmitting || isRedirectingToPayment || !canSubmit}
        >
          {isRedirectingToPayment ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              מעבירים אותך לתשלום מאובטח...
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 ml-2 animate-spin" />
              {paymentSimulationEnabled ? "יוצרים הזמנה לדוגמה..." : "יוצרים את ההזמנה..."}
            </>
          ) : paymentSimulationEnabled ? (
            <>השלמת הזמנה לדוגמה — &#8362;{totalPrice.toFixed(2)}</>
          ) : !checkoutEnabled ? (
            <>הזמנות אונליין ייפתחו בקרוב</>
          ) : (
            <>אישור ותשלום — &#8362;{totalPrice.toFixed(2)}</>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          {paymentSimulationEnabled ? "הדמיית תשלום לצורכי בדיקה. לא יבוצע חיוב." : "תשלום מאובטח ומוצפן"}
        </p>
      </div>

      {/* Spacer for the fixed bottom bar on mobile. The bar stacks terms +
          button + secure-payment note inside p-4, so it runs ~150px tall. */}
      <div className="h-40 md:hidden" />
    </div>
  );
}
