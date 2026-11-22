// push-send — delivers Lift Me push notifications to people's phones (web push).
//
// Called two ways:
//  * by the DATABASE (trigger on push_outbox, header x-push-secret): { outbox_id } → send that message
//    to every device of that user, then mark it sent. Dead devices (uninstalled, permission revoked)
//    are removed.
//  * by the APP (signed-in user):
//      { action: 'public-key' } → the VAPID public key the phone needs to subscribe
//      { action: 'test' }       → send "Notifications are on" to the caller's own devices
//
// The VAPID key pair is created here on first use and kept in push_config (server-only table);
// the private key never leaves the server.
import webpush from 'npm:web-push@3.6.7';
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { adminClient, errorResponse, getUser, json, serve } from '../_shared/common.ts';

type Config = { trigger_secret: string; vapid_public_key: string; vapid_private_key: string };

async function loadConfig(db: SupabaseClient): Promise<Config> {
  const { data, error } = await db.from('push_config').select('trigger_secret, vapid_public_key, vapid_private_key').eq('id', true).single();
  if (error || !data) throw new Error(`push_config missing: ${error?.message}`);
  if (data.vapid_public_key && data.vapid_private_key) return data as Config;

  // First use: create the key pair. If two calls race, only the first one is kept.
  const keys = webpush.generateVAPIDKeys();
  await db.from('push_config')
    .update({ vapid_public_key: keys.publicKey, vapid_private_key: keys.privateKey, updated_at: new Date().toISOString() })
    .eq('id', true).is('vapid_public_key', null);
  const again = await db.from('push_config').select('trigger_secret, vapid_public_key, vapid_private_key').eq('id', true).single();
  if (again.error || !again.data?.vapid_public_key) throw new Error('could not create push keys');
  return again.data as Config;
}

async function deliver(db: SupabaseClient, cfg: Config, userId: string, message: { title: string; body: string; url: string; tag: string | null }) {
  const { data: subs } = await db.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('user_id', userId);
  let sent = 0;
  const errors: string[] = [];
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(message),
        {
          vapidDetails: {
            subject: Deno.env.get('PUSH_SUBJECT') ?? 'https://rideliftme.com',
            publicKey: cfg.vapid_public_key,
            privateKey: cfg.vapid_private_key,
          },
          TTL: 15 * 60, // a ride alert older than 15 minutes is useless
          urgency: 'high',
        },
      );
      sent++;
      await db.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', s.id);
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        // The phone unsubscribed or the app was removed: forget this device.
        await db.from('push_subscriptions').delete().eq('id', s.id);
      } else {
        errors.push(`${status ?? ''} ${(err as Error).message}`.trim().slice(0, 200));
      }
    }
  }
  return { devices: subs?.length ?? 0, sent, error: errors.length ? errors.join(' | ') : null };
}

serve(async (req) => {
  const db = adminClient();
  const cfg = await loadConfig(db);
  const body = await req.json().catch(() => ({}));

  // From the database trigger.
  const secret = req.headers.get('x-push-secret');
  if (secret !== null) {
    if (secret !== cfg.trigger_secret) return errorResponse('forbidden', 403);
    const id = Number(body.outbox_id);
    if (!Number.isInteger(id)) return errorResponse('bad_request');
    const { data: msg } = await db.from('push_outbox').select('*').eq('id', id).maybeSingle();
    if (!msg || msg.sent_at) return json({ ok: true, skipped: true });
    const result = await deliver(db, cfg, msg.user_id, { title: msg.title, body: msg.body, url: msg.url, tag: msg.tag });
    await db.from('push_outbox').update({ sent_at: new Date().toISOString(), devices: result.sent, error: result.error }).eq('id', id);
    return json({ ok: true, ...result });
  }

  // From the app.
  const user = await getUser(req);
  if (!user) return errorResponse('not_signed_in', 401);
  if (body.action === 'public-key') return json({ publicKey: cfg.vapid_public_key });
  if (body.action === 'test') {
    const result = await deliver(db, cfg, user.id, {
      title: 'Notifications are on ✅',
      body: 'This is how Lift Me will tell you about your rides.',
      url: '/',
      tag: 'test',
    });
    if (!result.devices) return errorResponse('no_device', 409, 'This phone is not set up for notifications yet.');
    if (!result.sent) return errorResponse('push_failed', 502, 'The notification could not be delivered. Try turning notifications off and on.');
    return json({ ok: true, ...result });
  }
  return errorResponse('unknown_action');
});
