import { expect, test } from '@jest/globals';
import { scrubBreadcrumb, scrubEvent } from '../monitoringScrub';

test('navigation addresses lose their query (phone numbers)', () => {
  const c = scrubBreadcrumb({ data: { from: '/phone', to: '/otp?phone=%2B254700000099' } });
  expect(c.data).toEqual({ from: '/phone', to: '/otp' });
});

test('phone numbers in messages are hidden', () => {
  expect(scrubBreadcrumb({ message: 'Sending code to +254 700 000 099' }).message).toBe('Sending code to [number]');
  expect(scrubBreadcrumb({ message: 'ride 12 of 3' }).message).toBe('ride 12 of 3');
});

test('events keep only the anonymous user id', () => {
  const e = scrubEvent({ user: { id: 'abc', email: 'x@y.z', ip_address: '1.2.3.4' } as { id: string }, request: { url: 'https://rideliftme.com/otp?phone=254700000099', query_string: 'phone=1' } });
  expect(e.user).toEqual({ id: 'abc' });
  expect(e.request).toEqual({ url: 'https://rideliftme.com/otp' });
});
