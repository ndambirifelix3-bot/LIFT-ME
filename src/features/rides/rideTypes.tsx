/**
 * Ride types (Boda Electric, Boda, Lift Mini, Lift, Lift XL, Lift Premium) come from the `pricing`
 * catalogue in the database, so names and icons stay in one place and admins can rename them.
 */
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type RideType = Pick<Tables<'pricing'>, 'ride_type' | 'display_name' | 'description' | 'seats' | 'vehicle_kind' | 'is_electric' | 'sort_order'>;

export function useRideTypes() {
  return useQuery({
    queryKey: ['ride-types'],
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<RideType[]> => {
      const { data, error } = await supabase
        .from('pricing')
        .select('ride_type, display_name, description, seats, vehicle_kind, is_electric, sort_order')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

/** "Lift Premium" for 'lift_premium'; falls back to a tidy version of the code while loading. */
export function useRideTypeName(code: string | null | undefined): string {
  const types = useRideTypes();
  if (!code) return '';
  return types.data?.find((t) => t.ride_type === code)?.display_name ?? fallbackName(code);
}

export function fallbackName(code: string): string {
  return code.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export function rideTypeIcon(t: { ride_type: string; vehicle_kind?: string | null; is_electric?: boolean | null; seats?: number | null }): IconName {
  if (t.vehicle_kind === 'motorcycle') return t.is_electric ? 'motorbike-electric' : 'motorbike';
  if (t.ride_type.includes('premium')) return 'car-sports';
  if ((t.seats ?? 4) >= 5) return 'van-passenger';
  if ((t.seats ?? 4) <= 3) return 'car-hatchback';
  return 'car';
}

export function RideTypeIcon({ type, size = 30, color }: { type: Parameters<typeof rideTypeIcon>[0]; size?: number; color: string }) {
  return <MaterialCommunityIcons name={rideTypeIcon(type)} size={size} color={color} />;
}
