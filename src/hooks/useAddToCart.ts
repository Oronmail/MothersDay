import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useCartStore } from "@/stores/cartStore";
import { ShopifyProduct } from "@/lib/shopify";
import { startSpan } from "@/lib/sentry";

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
}

interface UseAddToCartOptions {
  product: ShopifyProduct;
  variant: VariantNode | null;
  onSuccess?: () => void;
}

/**
 * Custom hook for adding products to cart with consistent UX
 * Handles validation, cart mutation, and toast notifications
 */
export const useAddToCart = ({ product, variant, onSuccess }: UseAddToCartOptions) => {
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const [quantity, setQuantity] = useState(1);

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

          // Show success toast with undo option
          toast.success("המוצר נוסף לסל", {
            description: `${product.node.title}${variant.title !== "Default Title" ? ` - ${variant.title}` : ""} (${qtyToAdd})`,
            position: "top-center",
            duration: 4000,
            action: {
              label: "ביטול",
              onClick: () => {
                // Undo by setting quantity to 0 (removes item)
                updateQuantity(variant.id, 0);
                toast.info("המוצר הוסר מהסל");
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
    [product, variant, quantity, addItem, updateQuantity, onSuccess]
  );

  const incrementQuantity = useCallback(() => {
    setQuantity((prev) => Math.min(prev + 1, 99)); // Max 99
  }, []);

  const decrementQuantity = useCallback(() => {
    setQuantity((prev) => Math.max(prev - 1, 1)); // Min 1
  }, []);

  return {
    quantity,
    setQuantity,
    incrementQuantity,
    decrementQuantity,
    handleAddToCart,
  };
};
