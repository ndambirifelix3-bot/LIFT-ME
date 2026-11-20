import { describe, expect, it } from '@jest/globals';
import { decodePolyline, formatCountdown, formatDistance, formatDuration, formatMoney, fromMoneyInput, toMoneyInput } from '../format';
import { friendlyError } from '../errors';

describe('format', () => {
  it('money uses each currency\'s smallest unit', () => {
    expect(formatMoney(1234, 'KES')).toBe('KES 1,234');
    expect(formatMoney(1250, 'USD')).toBe('$12.50');
    expect(formatMoney(123456789, 'USD')).toBe('$1,234,567.89');
    expect(formatMoney(5, 'USD')).toBe('$0.05');
    expect(formatMoney(1050, 'KES', 0)).toBe('KES 1,050');
    expect(formatMoney(-190, 'USD')).toBe('-$1.90');
    expect(formatMoney(null)).toBe('—');
  });
  it('converts money to and from what people type', () => {
    expect(toMoneyInput(250, 2)).toBe('2.50');
    expect(toMoneyInput(100, 0)).toBe('100');
    expect(fromMoneyInput('2.5', 2)).toBe(250);
    expect(fromMoneyInput('8', 2)).toBe(800);
    expect(fromMoneyInput('1.755', 2)).toBeNull();
    expect(fromMoneyInput('100', 0)).toBe(100);
    expect(fromMoneyInput('10.5', 0)).toBeNull();
    expect(fromMoneyInput('abc', 2)).toBeNull();
  });
  it('distance and duration', () => {
    expect(formatDistance(850)).toBe('850 m');
    expect(formatDistance(12345)).toBe('12.3 km');
    expect(formatDistance(3219, 'mi')).toBe('2.0 mi');
    expect(formatDistance(100, 'mi')).toBe('328 ft');
    expect(formatDuration(30)).toBe('1 min');
    expect(formatDuration(3900)).toBe('1 h 5 min');
    expect(formatCountdown(125)).toBe('2:05');
  });
  it('decodes Google polylines', () => {
    // Example from Google's polyline documentation
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      { latitude: 38.5, longitude: -120.2 },
      { latitude: 40.7, longitude: -120.95 },
      { latitude: 43.252, longitude: -126.453 },
    ]);
  });
});

describe('friendlyError', () => {
  it('maps server codes to plain English', () => {
    expect(friendlyError({ message: 'ride_no_longer_available' })).toBe('Another driver took this ride.');
    expect(friendlyError(new Error('missing_documents: PSV Badge, Insurance'))).toBe('Please upload: PSV Badge, Insurance');
  });
});
