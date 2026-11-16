import { describe, expect, it } from '@jest/globals';
import { formatPhoneForDisplay, normalizeKenyanPhone } from '../phone';

describe('normalizeKenyanPhone', () => {
  it.each([
    ['0712345678', '+254712345678'],
    ['712345678', '+254712345678'],
    ['254712345678', '+254712345678'],
    ['+254 712 345 678', '+254712345678'],
    ['0110 123 456', '+254110123456'],
  ])('%s -> %s', (input, out) => expect(normalizeKenyanPhone(input)).toBe(out));

  it.each(['', '12345', '0812345678', '+1 415 555 0100', '07123456789'])('rejects %s', (input) =>
    expect(normalizeKenyanPhone(input)).toBeNull(),
  );

  it('formats for display', () => expect(formatPhoneForDisplay('+254712345678')).toBe('+254 712 345 678'));
});
