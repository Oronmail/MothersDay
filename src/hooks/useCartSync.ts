import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';
import { useCartStore } from '@/stores/cartStore';
import { CartItem } from '@/lib/types';

// The carts table hasn't been created yet, so sync quietly stays local-only.
// PGRST205 = PostgREST "table not in schema cache", 42P01 = Postgres
// "relation does not exist".
const TABLE_MISSING_CODES = new Set(['PGRST205', '42P01']);

/**
 * Mounted once (see AccountSync): mirrors the logged-in user's cart to the
 * `carts` table so it survives across devices and browsers. Guests keep
 * their cart in localStorage only (cartStore already persists it).
 *
 * On login the server cart is merged into the local one (local wins per
 * variant); afterwards every local change is debounce-saved to the server.
 */
export function useCartSync() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const items = useCartStore((s) => s.items);
  const disabledRef = useRef(false);
  const hydratedForUserRef = useRef<string | null>(null);
  const lastSavedRef = useRef<string | null>(null);

  // 1) On login: pull the server cart and merge it with the local one
  useEffect(() => {
    if (!userId) {
      hydratedForUserRef.current = null;
      lastSavedRef.current = null;
      return;
    }
    if (disabledRef.current || hydratedForUserRef.current === userId) return;

    let cancelled = false;

    const hydrate = async () => {
      const { data, error } = await supabase
        .from('carts')
        .select('items')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        if (TABLE_MISSING_CODES.has(error.code)) {
          disabledRef.current = true;
          console.warn('carts table missing - server cart sync disabled');
        }
        return;
      }

      const serverItems = (Array.isArray(data?.items) ? data!.items : []) as CartItem[];
      const localItems = useCartStore.getState().items;
      const localVariantIds = new Set(localItems.map((item) => item.variantId));
      const merged = [
        ...localItems,
        ...serverItems.filter(
          (item) => item?.variantId && !localVariantIds.has(item.variantId)
        ),
      ];

      hydratedForUserRef.current = userId;
      lastSavedRef.current = null;
      useCartStore.setState({ items: merged });
    };

    hydrate();
    return () => { cancelled = true; };
  }, [userId]);

  // 2) After hydration: debounce-save every cart change to the server
  useEffect(() => {
    if (!userId || disabledRef.current || hydratedForUserRef.current !== userId) return;

    const payload = JSON.stringify(items);
    if (payload === lastSavedRef.current) return;

    const timer = setTimeout(async () => {
      const { error } = await supabase
        .from('carts')
        .upsert({ user_id: userId, items }, { onConflict: 'user_id' });

      if (error) {
        if (TABLE_MISSING_CODES.has(error.code)) disabledRef.current = true;
        return;
      }
      lastSavedRef.current = payload;
    }, 800);

    return () => clearTimeout(timer);
  }, [userId, items]);
}
