import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useLocalWishlistStore } from '@/stores/wishlistStore';
import { trackAddToWishlist } from '@/lib/tracking';

/**
 * Hook to check whether a single product is in the current user's wishlist,
 * and to toggle it on/off.
 *
 * Guests keep their wishlist in localStorage (wishlistStore); logged-in users
 * keep it in the `wishlists` table.
 */
export function useWishlistToggle(productId: string | undefined) {
  const { user } = useAuth();
  const localIds = useLocalWishlistStore((s) => s.productIds);
  const [isInServerWishlist, setIsInServerWishlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Logged-in: check if the product is already in the account's wishlist
  useEffect(() => {
    if (!user || !productId) return;

    let cancelled = false;

    const check = async () => {
      const { data } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (!cancelled) {
        setIsInServerWishlist(!!data);
      }
    };

    check();
    return () => { cancelled = true; };
  }, [user, productId]);

  const isInWishlist = user
    ? isInServerWishlist
    : !!productId && localIds.includes(productId);

  const toggle = useCallback(async () => {
    if (!productId) return;

    // Guest: toggle in the local store, no account needed
    if (!user) {
      const store = useLocalWishlistStore.getState();
      if (store.productIds.includes(productId)) {
        store.remove(productId);
      } else {
        store.add(productId);
        trackAddToWishlist(productId);
      }
      return;
    }

    setIsLoading(true);

    try {
      if (isInWishlist) {
        // Remove from wishlist
        await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);
        setIsInServerWishlist(false);
      } else {
        // Add to wishlist
        await supabase
          .from('wishlists')
          .insert({ user_id: user.id, product_id: productId });
        setIsInServerWishlist(true);
        trackAddToWishlist(productId);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, productId, isInWishlist]);

  return { isInWishlist, toggle, isLoading, isLoggedIn: !!user };
}

export interface WishlistItem {
  /** Removal key: the wishlists row id for logged-in users, the product id for guests */
  id: string;
  created_at: string | null;
  product: {
    id: string;
    title: string;
    handle: string;
    price: number;
    product_images: Array<{ url: string; position: number }>;
  };
}

const PRODUCT_SELECT = 'id, title, handle, price, product_images(url, position)';

type WishlistProduct = WishlistItem['product'];

interface WishlistRow {
  id: string;
  created_at: string | null;
  product: WishlistProduct | null;
}

/**
 * Hook to load the full wishlist for the current user,
 * joining with the products table for current product info.
 * For guests, loads the products saved in the local store.
 */
export function useWishlistItems() {
  const { user } = useAuth();
  const localIds = useLocalWishlistStore((s) => s.productIds);
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      if (localIds.length === 0) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .in('id', localIds);

      if (!error && data) {
        const order = new Map(localIds.map((id, index) => [id, index]));
        setItems(
          (data as WishlistProduct[])
            .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
            .map((product) => ({
              id: product.id,
              created_at: null,
              product,
            }))
        );
      }
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('wishlists')
      .select(`id, created_at, product:product_id(${PRODUCT_SELECT})`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(
        (data as unknown as WishlistRow[])
          .filter((row): row is WishlistRow & { product: WishlistProduct } => row.product != null)
          .map((row) => ({
            id: row.id,
            created_at: row.created_at,
            product: row.product,
          }))
      );
    }
    setIsLoading(false);
  }, [user, localIds]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = useCallback(async (wishlistId: string) => {
    if (!user) {
      useLocalWishlistStore.getState().remove(wishlistId);
      setItems((prev) => prev.filter((item) => item.id !== wishlistId));
      return;
    }
    await supabase.from('wishlists').delete().eq('id', wishlistId);
    setItems((prev) => prev.filter((item) => item.id !== wishlistId));
  }, [user]);

  return { items, isLoading, reload: load, remove };
}

/**
 * Mounted once (see AccountSync): when a guest with locally-saved wishlist
 * items logs in, merge those items into the account's wishlist in Supabase
 * and clear the local copy. If anything fails, the local copy is kept and the
 * merge retries on the next login.
 */
export function useWishlistSync() {
  const { user } = useAuth();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!user) return;

    const localIds = useLocalWishlistStore.getState().productIds;
    if (localIds.length === 0 || syncingRef.current) return;
    syncingRef.current = true;

    const merge = async () => {
      try {
        const { data: existing, error: existingError } = await supabase
          .from('wishlists')
          .select('product_id')
          .eq('user_id', user.id);
        if (existingError) return;

        // Only merge products that still exist (guards the FK on insert)
        const { data: validProducts, error: validError } = await supabase
          .from('products')
          .select('id')
          .in('id', localIds);
        if (validError) return;

        const alreadySaved = new Set((existing ?? []).map((row) => row.product_id));
        const rowsToInsert = (validProducts ?? [])
          .map((row) => row.id)
          .filter((id) => !alreadySaved.has(id))
          .map((product_id) => ({ user_id: user.id, product_id }));

        if (rowsToInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('wishlists')
            .insert(rowsToInsert);
          if (insertError) return;
        }

        useLocalWishlistStore.getState().clear();
      } finally {
        syncingRef.current = false;
      }
    };

    merge();
  }, [user]);
}
