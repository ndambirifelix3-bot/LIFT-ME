import { describe, expect, it } from '@jest/globals';
import { cancelFeeNow, noShowSecondsLeft } from '../../features/rides/fees';

const market = { cancellation_fee: 100, cancellation_free_seconds: 120, no_show_wait_seconds: 300 };
const now = Date.parse('2026-11-28T10:00:00Z');

describe('cancelFeeNow', () => {
  it('is free while searching', () => {
    expect(cancelFeeNow({ status: 'searching', accepted_at: null, arrived_at: null }, market, now).fee).toBe(0);
  });
  it('is free in the first 2 minutes after a driver accepts', () => {
    const r = cancelFeeNow({ status: 'accepted', accepted_at: '2026-11-28T09:59:30Z', arrived_at: null }, market, now);
    expect(r).toEqual({ fee: 0, freeSecondsLeft: 90 });
  });
  it('charges after the free period, and once the driver has arrived', () => {
    expect(cancelFeeNow({ status: 'accepted', accepted_at: '2026-11-28T09:55:00Z', arrived_at: null }, market, now).fee).toBe(100);
    expect(cancelFeeNow({ status: 'arrived', accepted_at: '2026-11-28T09:59:50Z', arrived_at: '2026-11-28T09:59:55Z' }, market, now).fee).toBe(100);
  });
  it('is always free when the market has no fee', () => {
    expect(cancelFeeNow({ status: 'arrived', accepted_at: null, arrived_at: null }, { ...market, cancellation_fee: 0 }, now).fee).toBe(0);
  });
});

describe('noShowSecondsLeft', () => {
  it('counts down 5 minutes from arrival', () => {
    expect(noShowSecondsLeft({ status: 'arrived', accepted_at: null, arrived_at: '2026-11-28T09:58:00Z' }, market, now)).toBe(180);
    expect(noShowSecondsLeft({ status: 'arrived', accepted_at: null, arrived_at: '2026-11-28T09:50:00Z' }, market, now)).toBe(0);
  });
});
