import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type AppSettings = {
  currency: string;
  country_code: string;
  commission_percent: number;
  match_radius_km: number;
  search_timeout_seconds: number;
  location_interval_seconds: number;
  emergency_numbers: string[];
  support_phone: string;
  pricing_is_placeholder: boolean;
  [key: string]: unknown;
};

const DEFAULTS: AppSettings = {
  currency: 'KES',
  country_code: '+254',
  commission_percent: 0,
  match_radius_km: 5,
  search_timeout_seconds: 120,
  location_interval_seconds: 5,
  emergency_numbers: ['999', '112'],
  support_phone: '',
  pricing_is_placeholder: false,
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
