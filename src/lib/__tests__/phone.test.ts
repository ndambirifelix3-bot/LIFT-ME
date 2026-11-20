import { describe, expect, it } from '@jest/globals';
import { flagEmoji, formatPhoneForDisplay, normalizeKenyanPhone, normalizePhone } from '../phone';

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
});

describe('normalizePhone for the US (+1)', () => {
  it.each([
    ['4155550100', '+14155550100'],
    ['(415) 555-0100', '+14155550100'],
    ['1 415 555 0100', '+14155550100'],
    ['+1 415 555 0100', '+14155550100'],
  ])('%s -> %s', (input, out) => expect(normalizePhone(input, '+1')).toBe(out));

  it.each(['', '555 0100', '0155550100', '4151550100', '712345678', '41555501001'])('rejects %s', (input) =>
    expect(normalizePhone(input, '+1')).toBeNull(),
  );
});

describe('normalizePhone for other countries', () => {
  it('drops a typed country code or leading 0', () => {
    expect(normalizePhone('07700 900123', '+44')).toBe('+447700900123');
    expect(normalizePhone('+44 7700 900123', '+44')).toBe('+447700900123');
    expect(normalizePhone('123', '+44')).toBeNull();
  });
});

describe('display', () => {
  it('formats phone numbers', () => {
    expect(formatPhoneForDisplay('+254712345678')).toBe('+254 712 345 678');
    expect(formatPhoneForDisplay('+14155550100')).toBe('+1 (415) 555-0100');
    expect(formatPhoneForDisplay('+447700900123')).toBe('+447700900123');
  });
  it('makes flags from country codes', () => {
    expect(flagEmoji('ke')).toBe('🇰🇪');
    expect(flagEmoji('us')).toBe('🇺🇸');
    expect(flagEmoji('x')).toBe('');
  });
});
