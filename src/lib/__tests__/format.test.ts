import { describe, expect, it } from '@jest/globals';
import { decodePolyline, formatCountdown, formatDistance, formatDuration, formatMoney } from '../format';
import { friendlyError } from '../errors';

describe('format', () => {
  it('money is whole currency units', () => {
    expect(formatMoney(1234, 'KES')).toBe('KES 1,234');
    expect(formatMoney(null)).toBe('—');
  });
  it('distance and duration', () => {
    expect(formatDistance(850)).toBe('850 m');
    expect(formatDistance(12345)).toBe('12.3 km');
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
