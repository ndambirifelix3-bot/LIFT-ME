import { create } from 'zustand';
import type { LatLng } from '@/components/Map.types';
import type { Quote } from '@/features/rides/types';

export type Place = LatLng & { address: string };

type BookingState = {
  pickup: Place | null;
  dropoff: Place | null;
  pickupNote: string;
  quote: Quote | null;
  setPickup: (p: Place | null) => void;
  setDropoff: (p: Place | null) => void;
  setPickupNote: (n: string) => void;
  setQuote: (q: Quote | null) => void;
  reset: () => void;
};

/** Holds the booking in progress while the passenger moves between booking screens. */
export const useBooking = create<BookingState>((set) => ({
  pickup: null,
  dropoff: null,
  pickupNote: '',
  quote: null,
  setPickup: (pickup) => set({ pickup, quote: null }),
  setDropoff: (dropoff) => set({ dropoff, quote: null }),
  setPickupNote: (pickupNote) => set({ pickupNote }),
  setQuote: (quote) => set({ quote }),
  reset: () => set({ pickup: null, dropoff: null, pickupNote: '', quote: null }),
}));
