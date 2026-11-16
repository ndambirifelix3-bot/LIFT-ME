/**
 * Kenyan phone numbers are always saved as +2547XXXXXXXX / +2541XXXXXXXX.
 * Accepts: 0712345678, 712345678, 254712345678, +254 712 345 678
 */
export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  let local: string | null = null;
  if (/^254[17]\d{8}$/.test(digits)) local = digits.slice(3);
  else if (/^0[17]\d{8}$/.test(digits)) local = digits.slice(1);
  else if (/^[17]\d{8}$/.test(digits)) local = digits;
  return local ? `+254${local}` : null;
}

export function formatPhoneForDisplay(e164: string | null | undefined): string {
  if (!e164) return '';
  const m = /^\+254(\d{3})(\d{3})(\d{3})$/.exec(e164);
  return m ? `+254 ${m[1]} ${m[2]} ${m[3]}` : e164;
}
