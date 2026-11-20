import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';
import { useAuth } from './auth/AuthProvider';

/**
 * A market is a city/region Lift Me runs in (e.g. Nairobi, a US city). It decides the currency,
 * km or miles, phone country code, emergency numbers, payment methods and prices.
 */
export type Market = Tables<'markets'>;

/** Every market (public: also works before login, for the phone-number screen). */
export function useMarkets() {
  return useQuery({
    queryKey: ['markets'],
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<Market[]> => {
      const { data, error } = await supabase.from('markets').select('*').order('sort_order').order('code');
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMarket(code: string | null | undefined): Market | undefined {
  const { data } = useMarkets();
  return code ? data?.find((m) => m.code === code) : undefined;
}

/** The active market whose phone country code matches this number (longest code wins). */
export function marketForPhone(markets: Market[], phone: string | null | undefined): Market | undefined {
  if (!phone) return undefined;
  return markets
    .filter((m) => m.is_active && phone.startsWith(m.phone_country_code))
    .sort((a, b) => b.phone_country_code.length - a.phone_country_code.length || a.sort_order - b.sort_order)[0];
}

/** Country codes people can log in with: one entry per code, from active markets. */
export function phoneCountries(markets: Market[]): { dialCode: string; countryIso: string }[] {
  const seen = new Set<string>();
  const out: { dialCode: string; countryIso: string }[] = [];
  for (const m of markets) {
    if (!m.is_active || seen.has(m.phone_country_code)) continue;
    seen.add(m.phone_country_code);
    out.push({ dialCode: m.phone_country_code, countryIso: m.country_iso });
  }
  return out;
}

/**
 * The signed-in person's home market: a driver's own market; otherwise the one matching their
 * phone number; otherwise the first active market. Used for help numbers and similar.
 */
export function useMyMarket(): Market | undefined {
  const { profile } = useAuth();
  const markets = useMarkets().data ?? [];
  const driverMarket = useQuery({
    queryKey: ['my-driver-market', profile?.id],
    enabled: profile?.role === 'driver',
    queryFn: async () => {
      const { data, error } = await supabase.from('drivers').select('market_code').eq('id', profile!.id).maybeSingle();
      if (error) throw error;
      return data?.market_code ?? null;
    },
  });
  return (
    (driverMarket.data ? markets.find((m) => m.code === driverMarket.data) : undefined) ??
    marketForPhone(markets, profile?.phone) ??
    markets.find((m) => m.is_active)
  );
}
