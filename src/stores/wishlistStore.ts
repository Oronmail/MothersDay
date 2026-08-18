import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/**
 * Guest wishlist — product IDs persisted to localStorage so the selection
 * survives refresh without an account. When the user logs in,
 * useWishlistSync() merges these into the `wishlists` table and clears them,
 * making Supabase the source of truth for logged-in users.
 */
interface LocalWishlistStore {
  productIds: string[];
  add: (productId: string) => void;
  remove: (productId: string) => void;
  clear: () => void;
}

export const useLocalWishlistStore = create<LocalWishlistStore>()(
  persist(
    (set, get) => ({
      productIds: [],

      add: (productId) => {
        if (get().productIds.includes(productId)) return;
        set({ productIds: [productId, ...get().productIds] });
      },

      remove: (productId) => {
        set({ productIds: get().productIds.filter((id) => id !== productId) });
      },

      clear: () => set({ productIds: [] }),
    }),
    {
      name: 'wishlist-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
