import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createOrder } from '@/lib/api';
import { CartItem, ShippingAddress } from '@/lib/types';
import { startSpan, captureException, logger } from '@/lib/sentry';

interface CartStore {
  items: CartItem[];
  isLoading: boolean;

  addItem: (item: CartItem) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  setLoading: (loading: boolean) => void;
  createOrder: (userEmail: string, shippingAddress: ShippingAddress, shippingCost: number, userId?: string) => Promise<{ orderId: string; orderNumber: number }>;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
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
        set({ items: [] });
      },

      setLoading: (isLoading) => set({ isLoading }),

      createOrder: async (userEmail: string, shippingAddress: ShippingAddress, shippingCost: number, userId?: string) => {
        return startSpan(
          {
            op: 'ui.action',
            name: 'Create Order',
            attributes: {
              itemCount: get().items.length,
              hasEmail: !!userEmail,
              hasShippingAddress: !!shippingAddress,
              hasUserId: !!userId,
            },
          },
          async () => {
            const { items, setLoading, clearCart } = get();

            if (items.length === 0) {
              const error = new Error('Cart is empty');
              logger.warn('Order attempted with empty cart');
              throw error;
            }

            setLoading(true);
            try {
              logger.info('Creating order', {
                itemCount: items.length,
                totalValue: items.reduce((sum, item) => sum + (parseFloat(item.price.amount) * item.quantity), 0),
              });

              const lineItems = items.map(item => ({
                title: item.product.node.title,
                quantity: item.quantity,
                price: item.price.amount,
                image: item.product.node.images.edges[0]?.node.url || '',
                product_id: item.product.node.id,
                variant_id: item.variantId,
              }));

              const result = await createOrder(lineItems, userEmail, shippingAddress, shippingCost, userId);

              logger.info('Order created successfully', { orderId: result.orderId, orderNumber: result.orderNumber });
              clearCart();
              return result;
            } catch (error) {
              logger.error('Failed to create order', {
                error: error instanceof Error ? error.message : String(error),
                itemCount: items.length,
              });
              captureException(error instanceof Error ? error : new Error(String(error)), {
                context: 'createOrder',
                itemCount: items.length,
                userEmail,
                userId,
              });
              throw error;
            } finally {
              setLoading(false);
            }
          }
        );
      }
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
