import type { Tables } from '@/types/database';

export type Ride = Tables<'rides'>;
export type RideStatus = Ride['status'];
export type Payment = Tables<'payments'>;

export type QuoteOption = {
  ride_type: string;
  display_name: string;
  description: string;
  seats: number;
  /** 'car' or 'motorcycle' (boda). */
  vehicle_kind?: string;
  is_electric?: boolean;
  fare: number;
  currency: string;
};

export type Quote = {
  id: string;
  /** The market of the pickup point: decides currency, km/mi and payment methods. */
  market_code: string;
  options: QuoteOption[];
  currency: string;
  distance_m: number;
  duration_s: number;
  polyline: string | null;
  expires_at: string;
};

export type RideDetails = {
  ride: Omit<Ride, 'pickup' | 'dropoff'>;
  driver: null | {
    id: string;
    full_name: string;
    phone: string | null;
    photo_path: string | null;
    rating: number | null;
    vehicle: { make: string; model: string; colour: string; plate: string; year: number } | null;
    location: { lat: number; lng: number; heading: number | null; updated_at: string } | null;
  };
  passenger: { id: string; full_name: string; phone: string | null; rating: number | null } | null;
  /** The ride's market (currency decimals, km/mi, emergency numbers). */
  market: Omit<Tables<'markets'>, 'created_at' | 'updated_at'> | null;
  payment: Payment | null;
  my_rating: Tables<'ratings'> | null;
  events: Tables<'ride_events'>[] | null;
};

export const ACTIVE_STATUSES: RideStatus[] = ['searching', 'accepted', 'arrived', 'in_progress'];
