import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/** App-wide settings. Anything that differs by city/country (currency, emergency numbers, commission,
 *  support phone…) lives on the market instead — see features/markets.ts. */
export type AppSettings = {
  match_radius_km: number;
  search_timeout_seconds: number;
  location_fresh_seconds: number;
  location_interval_seconds: number;
  quote_valid_minutes: number;
  [key: string]: unknown;
};

const DEFAULTS: AppSettings = {
  match_radius_km: 5,
  search_timeout_seconds: 120,
  location_fresh_seconds: 120,
  location_interval_seconds: 5,
  quote_valid_minutes: 10,
};

/** Settings live in the database so they can change without a new app release. */
export function useSettings(enabled = true) {
  return useQuery({
    queryKey: ['settings'],
    enabled,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase.from('settings').select('key, value');
      if (error) throw error;
      const out: AppSettings = { ...DEFAULTS };
      for (const row of data ?? []) out[row.key] = row.value;
      return out;
    },
  });
}
