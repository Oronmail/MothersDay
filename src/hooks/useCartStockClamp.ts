import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCartStore } from '@/stores/cartStore';
import { AVAILABILITY_QUERY_KEY, fetchAvailability, variantMaxQuantity } from '@/lib/availability';

/**
 * On the checkout page: re-read availability for the cart's products and pull
 * quantities down to what can still be ordered (0 → the line is removed), so the
 * customer sees the limit before /api/create-order refuses the order.
 */
export function useCartStockClamp() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const productIds = [...new Set(items.map((i) => i.product.node.id))].sort();
  const announced = useRef(false);

  const query = useQuery({
    queryKey: [AVAILABILITY_QUERY_KEY, productIds],
    queryFn: () => fetchAvailability(productIds),
    enabled: productIds.length > 0,
    staleTime: 30_000,
  });

  useEffect(() => {
    const map = query.data;
    if (!map || map.size === 0) return;
    let changed = false;
    for (const item of items) {
      const row = map.get(item.variantId);
      if (!row) continue;
      const max = row.sellable ? variantMaxQuantity(row.max_orderable) : 0;
      if (item.quantity > max) {
        changed = true;
        if (max <= 0) removeItem(item.variantId);
        else updateQuantity(item.variantId, max);
      }
    }
    if (changed && !announced.current) {
      announced.current = true;
      toast.warning('עדכנו את הכמויות לפי המלאי הזמין', {
        description: 'חלק מהפריטים אזלו או שנשארו מהם פחות יחידות.',
      });
    }
  }, [query.data, items, updateQuantity, removeItem]);

  return query;
}
