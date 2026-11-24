import { verifyWebhook } from './stripe.ts';

async function sign(body: string, secret: string, t: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${t}.${body}`)));
  return Array.from(mac, (b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.test('webhook signatures', async () => {
  const t = Math.floor(Date.now() / 1000);
  const body = '{"id":"evt_1"}';
  const sig = await sign(body, 'whsec_test', t);
  const ok = (v: boolean, msg: string) => { if (!v) throw new Error(msg); };
  ok(await verifyWebhook(body, `t=${t},v1=${sig}`, 'whsec_test'), 'valid signature accepted');
  ok(!(await verifyWebhook(body + ' ', `t=${t},v1=${sig}`, 'whsec_test')), 'changed body rejected');
  ok(!(await verifyWebhook(body, `t=${t},v1=${sig}`, 'whsec_other')), 'wrong secret rejected');
  ok(!(await verifyWebhook(body, `t=${t - 600},v1=${await sign(body, 'whsec_test', t - 600)}`, 'whsec_test')), 'old event rejected');
  ok(!(await verifyWebhook(body, null, 'whsec_test')), 'missing header rejected');
});
