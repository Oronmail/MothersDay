import { useCartSync } from '@/hooks/useCartSync';
import { useWishlistSync } from '@/hooks/useWishlist';
import { useClaimOrders } from '@/hooks/useClaimOrders';

/**
 * Mounted once in the store layout (SiteAccess). For logged-in users it
 * merges the guest wishlist into the account, mirrors the cart to Supabase,
 * and attaches past guest orders (same email) to the account. Renders nothing.
 */
export function AccountSync() {
  useCartSync();
  useWishlistSync();
  useClaimOrders();
  return null;
}
