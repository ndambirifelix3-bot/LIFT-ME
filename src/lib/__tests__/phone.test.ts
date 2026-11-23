import { describe, expect, it } from '@jest/globals';
import { flagEmoji, formatNorthAmericaInput, formatPhoneForDisplay, normalizeKenyanPhone, normalizePhone } from '../phone';

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

describe('formatNorthAmericaInput', () => {
  it('formats US numbers as they are typed', () => {
    expect(formatNorthAmericaInput('574')).toBe('574');
    expect(formatNorthAmericaInput('5745')).toBe('(574) 5');
    expect(formatNorthAmericaInput('574555')).toBe('(574) 555');
    expect(formatNorthAmericaInput('5745550101')).toBe('(574) 555-0101');
    expect(formatNorthAmericaInput('1 574 555 0101')).toBe('(574) 555-0101');
    expect(formatNorthAmericaInput('(574) 555-01011')).toBe('(574) 555-0101');
  });
  it('deleting never gets stuck on a bracket', () => {
    expect(formatNorthAmericaInput('(574) ')).toBe('574');
  });
  it('the formatted number is accepted', () => {
    expect(normalizePhone(formatNorthAmericaInput('5745550101'), '+1')).toBe('+15745550101');
  });
});
