// Run: npx deno test supabase/functions
import { assertEquals } from 'jsr:@std/assert@1';
import { darajaTimestamp, interpretStkQuery, toMsisdn } from './mpesa.ts';

Deno.test('toMsisdn normalises Kenyan numbers for Daraja', () => {
  assertEquals(toMsisdn('+254712345678'), '254712345678');
  assertEquals(toMsisdn('0712345678'), '254712345678');
  assertEquals(toMsisdn('0110123456'), '254110123456');
  assertEquals(toMsisdn('12345'), null);
});

Deno.test('darajaTimestamp is Nairobi time, YYYYMMDDHHmmss', () => {
  assertEquals(darajaTimestamp(new Date('2026-01-31T22:05:09Z')), '20260201010509');
});

Deno.test('status query: "still processing" is pending, not failed', () => {
  assertEquals(interpretStkQuery({ errorCode: '500.001.1001', errorMessage: 'The transaction is being processed' }).pending, true);
  const processing = interpretStkQuery({ ResultCode: '4999', ResultDesc: 'The transaction is still under processing' });
  assertEquals([processing.pending, processing.ok], [true, false]);
  const paid = interpretStkQuery({ ResultCode: '0', ResultDesc: 'The service request is processed successfully.' });
  assertEquals([paid.pending, paid.ok], [false, true]);
  const cancelled = interpretStkQuery({ ResultCode: '1032', ResultDesc: 'Request cancelled by user' });
  assertEquals([cancelled.pending, cancelled.ok, cancelled.resultCode], [false, false, '1032']);
});
