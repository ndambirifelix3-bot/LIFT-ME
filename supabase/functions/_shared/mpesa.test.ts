// Run: npx deno test supabase/functions
import { assertEquals } from 'jsr:@std/assert@1';
import { darajaTimestamp, toMsisdn } from './mpesa.ts';

Deno.test('toMsisdn normalises Kenyan numbers for Daraja', () => {
  assertEquals(toMsisdn('+254712345678'), '254712345678');
  assertEquals(toMsisdn('0712345678'), '254712345678');
  assertEquals(toMsisdn('0110123456'), '254110123456');
  assertEquals(toMsisdn('12345'), null);
});

Deno.test('darajaTimestamp is Nairobi time, YYYYMMDDHHmmss', () => {
  assertEquals(darajaTimestamp(new Date('2026-01-31T22:05:09Z')), '20260201010509');
});
