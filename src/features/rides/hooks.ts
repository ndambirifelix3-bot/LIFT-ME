import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { ACTIVE_STATUSES, type RideDetails } from './types';

export function useRideDetails(rideId: string | undefined, opts?: { poll?: number }) {
  return useQuery({
    queryKey: ['ride', rideId],
    enabled: !!rideId,
    refetchInterval: opts?.poll,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_ride_details', { p_ride_id: rideId! });
      if (error) throw error;
      return data as unknown as RideDetails;
    },
  });
}

/**
 * Live updates via Supabase Realtime: ride status, payment and driver location.
 * On any change we simply reload the ride from the database (the source of truth).
 */
export function useRideRealtime(rideId: string | undefined, driverId: string | null | undefined) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!rideId) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['ride', rideId] });
    let channel = supabase
      .channel(`ride-${rideId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rides', filter: `id=eq.${rideId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `ride_id=eq.${rideId}` }, refresh);
    if (driverId) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_locations', filter: `driver_id=eq.${driverId}` },
        refresh,
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [rideId, driverId, queryClient]);
}

export function useActiveRide(userId: string | undefined, as: 'passenger' | 'driver') {
  return useQuery({
    queryKey: ['active-ride', as, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq(as === 'passenger' ? 'passenger_id' : 'driver_id', userId!)
        .in('status', ACTIVE_STATUSES)
        .order('requested_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useRideHistory(userId: string | undefined, as: 'passenger' | 'driver') {
  return useQuery({
    queryKey: ['ride-history', as, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rides')
        .select('*, payments(status, method)')
        .eq(as === 'passenger' ? 'passenger_id' : 'driver_id', userId!)
        .order('requested_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}

/** Wraps a ride RPC (cancel, accept, arrived…) and refreshes everything ride-related afterwards. */
export function useRideAction<TArgs>(fn: (args: TArgs) => PromiseLike<{ error: unknown; data?: unknown }>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (args: TArgs) => {
      const { data, error } = await fn(args);
      if (error) throw error;
      return data;
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ride'] });
      queryClient.invalidateQueries({ queryKey: ['active-ride'] });
      queryClient.invalidateQueries({ queryKey: ['ride-history'] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['earnings'] });
    },
  });
}

export function useSignedPhoto(path: string | null | undefined) {
  return useQuery({
    queryKey: ['signed', path],
    enabled: !!path,
    staleTime: 50 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from('driver-documents').createSignedUrl(path!, 60);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}
