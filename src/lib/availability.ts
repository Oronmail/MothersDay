import { supabase } from './supabase';
import { MAX_ITEM_QUANTITY } from './checkoutConfig';
import type { CartItem, ProductEdge } from './types';

/**
 * Storefront stock awareness. The database decides (spec §4.2); the storefront
 * only learns two things per variant: can it be sold, and how many at most.
 * Exact stock numbers never reach the browser.
 */

export interface AvailabilityRow {
  product_id: string;
  variant_id: string;
  sellable: boolean;
  max_orderable: number | null;
}

export const AVAILABILITY_QUERY_KEY = 'storefront-availability';

/** variant_id → row. Fails OPEN: any error yields an empty map and everything stays sellable. */
export async function fetchAvailability(productIds: string[]): Promise<Map<string, AvailabilityRow>> {
  const map = new Map<string, AvailabilityRow>();
  const ids = [...new Set(productIds)].filter(Boolean);
  if (ids.length === 0) return map;
  const { data, error } = await supabase
    .from('storefront_availability')
    .select('product_id, variant_id, sellable, max_orderable')
    .in('product_id', ids);
  if (error) {
    console.warn('storefront_availability unavailable, failing open:', error.message);
    return map;
  }
  for (const row of (data ?? []) as AvailabilityRow[]) map.set(row.variant_id, row);
  return map;
}

/** Pure. Variants missing from the map are left untouched; a manual "off" is never re-enabled. */
export function applyAvailability(edges: ProductEdge[], map: Map<string, AvailabilityRow>): ProductEdge[] {
  if (map.size === 0) return edges;
  return edges.map((edge) => ({
    node: {
      ...edge.node,
      variants: {
        edges: edge.node.variants.edges.map((v) => {
          const row = map.get(v.node.id);
          if (!row) return v;
          return {
            node: {
              ...v.node,
              availableForSale: v.node.availableForSale && row.sellable,
              maxOrderable: row.max_orderable,
            },
          };
        }),
      },
    },
  }));
}

/** The most a customer may add of a variant: stock limit if known, else the order API's cap. */
export function variantMaxQuantity(maxOrderable: number | null | undefined): number {
  if (maxOrderable === null || maxOrderable === undefined) return MAX_ITEM_QUANTITY;
  return Math.max(0, Math.min(MAX_ITEM_QUANTITY, maxOrderable));
}

/** Hebrew counts one differently: "נשארה יחידה אחת", not "נשארו 1 יחידות". */
export const unitsLeftText = (n: number) => (n === 1 ? 'נשארה יחידה אחת' : `נשארו ${n} יחידות`);

export function cartItemMaxQuantity(item: CartItem): number {
  const node = item.product.node.variants.edges.find((e) => e.node.id === item.variantId)?.node;
  return variantMaxQuantity(node?.maxOrderable);
}
