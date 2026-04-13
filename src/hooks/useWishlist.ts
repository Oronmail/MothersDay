import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

/**
 * Hook to check whether a single product is in the current user's wishlist,
 * and to toggle it on/off.
 */
export function useWishlistToggle(productId: string | undefined) {
  const { user } = useAuth();
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if the product is already in wishlist
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
        setIsInWishlist(!!data);
      }
    };

    check();
    return () => { cancelled = true; };
  }, [user, productId]);

  const toggle = useCallback(async () => {
    if (!user || !productId) return;

    setIsLoading(true);

    try {
      if (isInWishlist) {
        // Remove from wishlist
        await supabase
          .from('wishlists')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);
        setIsInWishlist(false);
      } else {
        // Add to wishlist
        await supabase
          .from('wishlists')
          .insert({ user_id: user.id, product_id: productId });
        setIsInWishlist(true);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, productId, isInWishlist]);

  return { isInWishlist, toggle, isLoading, isLoggedIn: !!user };
}

export interface WishlistItem {
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

/**
 * Hook to load the full wishlist for the current user,
 * joining with the products table for current product info.
 */
export function useWishlistItems() {
  const { user } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('wishlists')
      .select('id, created_at, product:product_id(id, title, handle, price, product_images(url, position))')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setItems(
        (data as any[]).filter((row) => row.product != null).map((row) => ({
          id: row.id,
          created_at: row.created_at,
          product: row.product,
        }))
      );
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = useCallback(async (wishlistId: string) => {
    await supabase.from('wishlists').delete().eq('id', wishlistId);
    setItems((prev) => prev.filter((item) => item.id !== wishlistId));
  }, []);

  return { items, isLoading, reload: load, remove };
}
