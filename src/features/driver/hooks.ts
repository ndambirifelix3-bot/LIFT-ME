import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type DriverRow = Tables<'drivers'>;

export function useMyDriver(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-driver', userId],
    enabled: !!userId,
    queryFn: async () => {
      const [driver, vehicle, docs, types] = await Promise.all([
        supabase.from('drivers').select('*').eq('id', userId!).maybeSingle(),
        supabase.from('vehicles').select('*').eq('driver_id', userId!).maybeSingle(),
        supabase.from('driver_documents').select('*').eq('driver_id', userId!),
        supabase.from('document_types').select('*').eq('is_active', true).order('sort_order'),
      ]);
      for (const r of [driver, vehicle, docs, types]) if (r.error) throw r.error;
      // Only ask for documents that apply everywhere or in the driver's own country.
      let country: string | null = null;
      if (driver.data?.market_code) {
        const m = await supabase.from('markets').select('country_iso').eq('code', driver.data.market_code).maybeSingle();
        if (m.error) throw m.error;
        country = m.data?.country_iso ?? null;
      }
      const documentTypes = (types.data ?? []).filter((t) => !t.country_iso || t.country_iso === country);
      return { driver: driver.data, vehicle: vehicle.data, documents: docs.data ?? [], documentTypes };
    },
  });
}

/** Incoming requests for this driver (live + polling fallback for weak internet). */
export function useOffers(userId: string | undefined, enabled: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId || !enabled) return;
    const channel = supabase
      .channel(`offers-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_offers', filter: `driver_id=eq.${userId}` }, () =>
        queryClient.invalidateQueries({ queryKey: ['offers', userId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, enabled, queryClient]);

  return useQuery({
    queryKey: ['offers', userId],
    enabled: !!userId && enabled,
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ride_offers')
        .select('*, ride:rides(*)')
        .eq('driver_id', userId!)
        .eq('response', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('offered_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((o) => o.ride && o.ride.status === 'searching');
    },
  });
}

export type Earnings = {
  market_code: string | null;
  currency: string;
  currency_decimals: number | null;
  today: number; today_trips: number;
  week: number; week_trips: number;
  total: number; total_trips: number;
  rating: number | null;
};

export function useEarnings(enabled = true) {
  return useQuery({
    queryKey: ['earnings'],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_driver_earnings');
      if (error) throw error;
      return data as unknown as Earnings;
    },
  });
}
