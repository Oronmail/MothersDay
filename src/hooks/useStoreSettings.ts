import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface StoreSettings {
  shipping_cost: number;
  free_shipping_threshold: number;
  shipping_enabled: boolean;
}

const DEFAULTS: StoreSettings = {
  shipping_cost: 35,
  free_shipping_threshold: 350,
  shipping_enabled: true,
};

export function useStoreSettings() {
  return useQuery({
    queryKey: ['store-settings'],
    queryFn: async (): Promise<StoreSettings> => {
      const { data, error } = await supabase
        .from('store_settings')
        .select('key, value');
      if (error) throw error;

      const map = new Map((data ?? []).map((row: { key: string; value: unknown }) => [row.key, row.value]));
      const enabledRaw = map.get('shipping_enabled');
      return {
        shipping_cost: Number(map.get('shipping_cost') ?? DEFAULTS.shipping_cost),
        free_shipping_threshold: Number(map.get('free_shipping_threshold') ?? DEFAULTS.free_shipping_threshold),
        shipping_enabled: enabledRaw === undefined || enabledRaw === null
          ? DEFAULTS.shipping_enabled
          : Boolean(enabledRaw),
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}
