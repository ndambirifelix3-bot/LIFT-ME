/**
 * Phone numbers are always saved in international form (E.164), e.g. +254712345678 or +14155550100.
 * The country code comes from the market the person picks on the login screen.
 */

/** Kenya: 07XX / 01XX mobile numbers. Accepts 0712345678, 712345678, 254712345678, +254 712 345 678. */
function kenya(digits: string): string | null {
  let local: string | null = null;
  if (/^254[17]\d{8}$/.test(digits)) local = digits.slice(3);
  else if (/^0[17]\d{8}$/.test(digits)) local = digits.slice(1);
  else if (/^[17]\d{8}$/.test(digits)) local = digits;
  return local ? `+254${local}` : null;
}

/** USA / Canada (+1): 10 digits, area code and exchange can't start with 0 or 1. Accepts (415) 555-0100, 1 415 555 0100. */
function northAmerica(digits: string): string | null {
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return /^[2-9]\d{2}[2-9]\d{6}$/.test(local) ? `+1${local}` : null;
}

/** Any other country: drop the country code or a leading 0 if typed, keep 6–12 digits. */
function generic(digits: string, dialDigits: string): string | null {
  let local = digits.startsWith(dialDigits) && digits.length > dialDigits.length + 5 ? digits.slice(dialDigits.length) : digits;
  local = local.replace(/^0+/, '');
  return /^\d{6,12}$/.test(local) ? `+${dialDigits}${local}` : null;
}

/** Turns what someone typed into +<country><number>, or null if it isn't a valid number for that country. */
export function normalizePhone(input: string, dialCode: string): string | null {
  const digits = input.replace(/\D/g, '');
  const dialDigits = dialCode.replace(/\D/g, '');
  if (!digits || !dialDigits) return null;
  if (dialDigits === '254') return kenya(digits);
  if (dialDigits === '1') return northAmerica(digits);
  return generic(digits, dialDigits);
}

export function normalizeKenyanPhone(input: string): string | null {
  return normalizePhone(input, '+254');
}

/** Example shown inside the phone box for each country code. */
export function phonePlaceholder(dialCode: string): string {
  if (dialCode === '+254') return '712 345 678';
  if (dialCode === '+1') return '(574) 555-0101';
  return 'Phone number';
}

/**
 * Formats a US / Canada number while it's being typed: "5745550101" -> "(574) 555-0101".
 * Up to 3 digits stay plain, so deleting never gets stuck on a bracket or dash.
 * A leading country "1" (1 574 555 0101) is dropped because +1 is already shown.
 */
export function formatNorthAmericaInput(text: string): string {
  let d = text.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export function formatPhoneForDisplay(e164: string | null | undefined): string {
  if (!e164) return '';
  const ke = /^\+254(\d{3})(\d{3})(\d{3})$/.exec(e164);
  if (ke) return `+254 ${ke[1]} ${ke[2]} ${ke[3]}`;
  const us = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  if (us) return `+1 (${us[1]}) ${us[2]}-${us[3]}`;
  return e164;
}

/** 🇰🇪 from 'ke', 🇺🇸 from 'us'. */
export function flagEmoji(countryIso: string): string {
  const iso = countryIso.toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso)) return '';
  return String.fromCodePoint(...[...iso].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}
