import { useCartSync } from '@/hooks/useCartSync';
import { useWishlistSync } from '@/hooks/useWishlist';

/**
 * Mounted once in the store layout (SiteAccess). For logged-in users it
 * merges the guest wishlist into the account and mirrors the cart to
 * Supabase. Renders nothing.
 */
export function AccountSync() {
  useCartSync();
  useWishlistSync();
  return null;
}
