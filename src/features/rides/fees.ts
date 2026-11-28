import type { Tables } from '@/types/database';

type MarketFees = Pick<Tables<'markets'>, 'cancellation_fee' | 'cancellation_free_seconds' | 'no_show_wait_seconds'>;
type RideTimes = Pick<Tables<'rides'>, 'status' | 'accepted_at' | 'arrived_at'>;

/**
 * Would cancelling now cost the passenger a fee? (The server decides for real; this is only the warning.)
 * Free while searching and for the first few minutes after a driver accepts; charged once the driver
 * has arrived or was on the way longer than that.
 */
export function cancelFeeNow(ride: RideTimes, market: MarketFees | null | undefined, now = Date.now()) {
  const fee = market?.cancellation_fee ?? 0;
  if (!fee || (ride.status !== 'accepted' && ride.status !== 'arrived')) return { fee: 0, freeSecondsLeft: 0 };
  if (ride.status === 'arrived') return { fee, freeSecondsLeft: 0 };
  const freeUntil = new Date(ride.accepted_at ?? now).getTime() + (market?.cancellation_free_seconds ?? 0) * 1000;
  const left = Math.ceil((freeUntil - now) / 1000);
  return left > 0 ? { fee: 0, freeSecondsLeft: left } : { fee, freeSecondsLeft: 0 };
}

/** Seconds until a driver may report a no-show (0 = now). */
export function noShowSecondsLeft(ride: RideTimes, market: MarketFees | null | undefined, now = Date.now()) {
  if (ride.status !== 'arrived' || !ride.arrived_at) return Infinity;
  const at = new Date(ride.arrived_at).getTime() + (market?.no_show_wait_seconds ?? 300) * 1000;
  return Math.max(0, Math.ceil((at - now) / 1000));
}
