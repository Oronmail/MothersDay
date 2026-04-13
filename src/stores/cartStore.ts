import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, createStorefrontCheckout, ShippingAddress } from '@/lib/shopify';
import { startSpan, captureException, logger } from '@/lib/sentry';

interface CartStore {
  items: CartItem[];
  cartId: string | null;
  checkoutUrl: string | null;
  isLoading: boolean;
  
  addItem: (item: CartItem) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  setCartId: (cartId: string) => void;
  setCheckoutUrl: (url: string) => void;
  setLoading: (loading: boolean) => void;
  createCheckout: (userEmail?: string, shippingAddress?: ShippingAddress, userId?: string) => Promise<string>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartId: null,
      checkoutUrl: null,
      isLoading: false,

      addItem: (item) => {
        const { items } = get();
        const existingItem = items.find(i => i.variantId === item.variantId);
        
        if (existingItem) {
          set({
            items: items.map(i =>
              i.variantId === item.variantId
                ? { ...i, quantity: i.quantity + item.quantity }
                : i
            )
          });
        } else {
          set({ items: [...items, item] });
        }
      },

      updateQuantity: (variantId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(variantId);
          return;
        }
        
        set({
          items: get().items.map(item =>
            item.variantId === variantId ? { ...item, quantity } : item
          )
        });
      },

      removeItem: (variantId) => {
        set({
          items: get().items.filter(item => item.variantId !== variantId)
        });
      },

      clearCart: () => {
        set({ items: [], cartId: null, checkoutUrl: null });
      },

      setCartId: (cartId) => set({ cartId }),
      setCheckoutUrl: (checkoutUrl) => set({ checkoutUrl }),
      setLoading: (isLoading) => set({ isLoading }),

      createCheckout: async (userEmail?: string, shippingAddress?: ShippingAddress, userId?: string) => {
        return startSpan(
          {
            op: 'ui.action',
            name: 'Create Checkout',
            attributes: {
              itemCount: get().items.length,
              hasEmail: !!userEmail,
              hasShippingAddress: !!shippingAddress,
              hasUserId: !!userId,
            },
          },
          async () => {
            const { items, setLoading, setCheckoutUrl } = get();

            if (items.length === 0) {
              const error = new Error('Cart is empty');
              logger.warn('Checkout attempted with empty cart');
              throw error;
            }

            setLoading(true);
            try {
              logger.info('Creating checkout', {
                itemCount: items.length,
                totalValue: items.reduce((sum, item) => sum + (parseFloat(item.price.amount) * item.quantity), 0),
              });

              const checkoutUrl = await createStorefrontCheckout(items, userEmail, shippingAddress, userId);

              if (!checkoutUrl) {
                const error = new Error('No checkout URL returned');
                captureException(error, {
                  itemCount: items.length,
                  userEmail,
                  userId,
                });
                throw error;
              }

              logger.info('Checkout created successfully', { checkoutUrl });
              setCheckoutUrl(checkoutUrl);
              return checkoutUrl;
            } catch (error) {
              logger.error('Failed to create checkout', {
                error: error instanceof Error ? error.message : String(error),
                itemCount: items.length,
              });
              captureException(error instanceof Error ? error : new Error(String(error)), {
                context: 'createCheckout',
                itemCount: items.length,
                userEmail,
                userId,
              });
              throw error;
            } finally {
              // Always set loading to false in finally block (runs regardless of success/error)
              setLoading(false);
            }
          }
        );
      }
    }),
    {
      name: 'shopify-cart',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
