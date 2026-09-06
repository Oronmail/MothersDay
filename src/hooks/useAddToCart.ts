import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "@/stores/cartStore";
import { ProductEdge } from "@/lib/types";
import { startSpan } from "@/lib/sentry";
import { ROUTES } from "@/lib/routes";
import { cartItemToTracked, trackAddToCart } from "@/lib/tracking";
import { unitsLeftText, variantMaxQuantity } from "@/lib/availability";

interface VariantNode {
  id: string;
  title: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
  maxOrderable?: number | null;
}

interface UseAddToCartOptions {
  product: ProductEdge;
  variant: VariantNode | null;
  onSuccess?: () => void;
}

/**
 * Custom hook for adding products to cart with consistent UX
 * Handles validation, cart mutation, and toast notifications
 */
export const useAddToCart = ({ product, variant, onSuccess }: UseAddToCartOptions) => {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const maxQuantity = variantMaxQuantity(variant?.maxOrderable);

  const handleAddToCart = useCallback(
    (customQuantity?: number) => {
      return startSpan(
        {
          op: "ui.action",
          name: "Add to Cart",
          attributes: {
            productId: product.node.id,
            productTitle: product.node.title,
            variantId: variant?.id || "none",
            quantity: customQuantity ?? quantity,
          },
        },
        () => {
          const qtyToAdd = customQuantity ?? quantity;

          // Validation
          if (!variant) {
            toast.error("אנא בחר אפשרות למוצר", {
              description: "יש לבחור גודל או צבע לפני הוספה לסל",
              position: "top-center",
            });
            return false;
          }

          if (qtyToAdd < 1) {
            toast.error("כמות לא תקינה", {
              description: "הכמות חייבת להיות לפחות 1",
              position: "top-center",
            });
            return false;
          }

          if (qtyToAdd > maxQuantity) {
            toast.error("אין מספיק במלאי", {
              description: maxQuantity === 0 ? "המוצר אזל מהמלאי" : `${unitsLeftText(maxQuantity)} בלבד`,
              position: "top-center",
            });
            return false;
          }

          // Add to cart
          const cartItem = {
            product,
            variantId: variant.id,
            variantTitle: variant.title,
            price: variant.price,
            quantity: qtyToAdd,
            selectedOptions: variant.selectedOptions,
          };

          addItem(cartItem);
          trackAddToCart(cartItemToTracked(cartItem));

          // Show success toast with a link straight to checkout
          toast.success("המוצר נוסף לסל", {
            description: `${product.node.title}${variant.title !== "Default Title" ? ` - ${variant.title}` : ""} (${qtyToAdd})`,
            position: "top-center",
            duration: 5000,
            // Product name carries the narrow brand font; the label stays in body type.
            classNames: { description: "group-[.toast]:font-display" },
            action: {
              label: "לתשלום",
              onClick: () => {
                navigate(ROUTES.checkout);
              },
            },
          });

          // Reset quantity to 1 after adding
          setQuantity(1);

          // Call optional success callback
          onSuccess?.();

          return true;
        }
      );
    },
    [product, variant, quantity, maxQuantity, addItem, onSuccess, navigate]
  );

  const incrementQuantity = useCallback(() => {
    // Stock limit when known, else the per-line cap enforced by /api/create-order.
    setQuantity((prev) => Math.min(prev + 1, Math.max(1, maxQuantity)));
  }, [maxQuantity]);

  const decrementQuantity = useCallback(() => {
    setQuantity((prev) => Math.max(prev - 1, 1)); // Min 1
  }, []);

  return {
    quantity,
    setQuantity,
    incrementQuantity,
    decrementQuantity,
    handleAddToCart,
    maxQuantity,
  };
};
