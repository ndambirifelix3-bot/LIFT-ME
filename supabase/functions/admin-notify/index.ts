// admin-notify — emails the Lift Me admin team (new driver applications, help reports, test emails).
//
// Called only by the DATABASE (trigger on admin_email_outbox, header x-push-secret = push_config.trigger_secret):
//   { outbox_id } → build the email for that row, send it through Resend, record the result.
// Recipients: setting `admin_notify_emails` (a list). Secret: RESEND_API_KEY (Supabase → Edge Functions → Secrets).
import { adminClient, errorResponse, json, serve } from '../_shared/common.ts';

const SITE = 'https://rideliftme.com';
const FROM = 'Lift Me <no-reply@rideliftme.com>';

type Payload = Record<string, string | boolean | null | undefined>;

const CATEGORY: Record<string, string> = {
  safety: 'Safety', payment: 'Payment', driver: 'About a driver', passenger: 'About a passenger',
  app: 'App problem', lost_item: 'Lost item', other: 'Other',
};

function esc(v: unknown): string {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function layout(title: string, rows: [string, unknown][], button: { label: string; href: string } | null, note = ''): string {
  const lines = rows
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#666;vertical-align:top;white-space:nowrap">${esc(k)}</td><td style="padding:6px 0">${esc(v)}</td></tr>`)
    .join('');
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#171717">
  <h2 style="margin:0 0 12px">${esc(title)}</h2>
  ${note ? `<p style="margin:0 0 12px">${note}</p>` : ''}
  <table style="border-collapse:collapse;font-size:15px">${lines}</table>
  ${button ? `<p style="margin:24px 0"><a href="${button.href}" style="background:#FFC107;color:#101010;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px;display:inline-block">${esc(button.label)}</a></p>` : ''}
  <p style="color:#888;font-size:12px;margin-top:24px">Lift Me admin notice · ${SITE}</p>
</div>`;
}

function build(kind: string, p: Payload): { subject: string; html: string } {
  if (kind === 'driver_application') {
    const again = p.resubmitted ? ' (resubmitted)' : '';
    return {
      subject: `New driver application${again}: ${p.name || 'unnamed'} · ${p.ride_type ?? ''} · ${p.market ?? ''}`,
      html: layout(`New driver application${again}`, [
        ['Name', p.name], ['Phone', p.phone], ['Email', p.email], ['Country', p.market],
        ['Drives', p.ride_type], ['Vehicle', p.vehicle], ['Plate', p.plate],
      ], { label: 'Review the application', href: `${SITE}/admin/drivers/${p.driver_id}` },
      'Check the documents and photo, then approve or reject.'),
    };
  }
  if (kind === 'support_report') {
    const urgent = p.category === 'safety';
    return {
      subject: `${urgent ? 'URGENT – ' : ''}Help report: ${CATEGORY[String(p.category)] ?? p.category} from ${p.name || 'a user'}`,
      html: layout(`${urgent ? '⚠️ ' : ''}New help report`, [
        ['Topic', CATEGORY[String(p.category)] ?? p.category], ['From', `${p.name || '—'} (${p.role ?? 'user'})`],
        ['Phone', p.phone], ['Email', p.email], ['Message', p.message], ['About a trip', p.ride_id ? 'Yes' : 'No'],
      ], { label: 'Open reports', href: `${SITE}/admin/reports` },
      urgent ? '<b>Safety report: please contact the person as soon as possible.</b>' : ''),
    };
  }
  return {
    subject: 'Lift Me admin emails are working ✅',
    html: layout('Test email', [['Requested by', p.requested_by]], null, 'Admin emails (new driver applications and help reports) will arrive at this address.'),
  };
}

serve(async (req) => {
  const db = adminClient();
  const { data: cfg } = await db.from('push_config').select('trigger_secret').eq('id', true).single();
  if (!cfg || req.headers.get('x-push-secret') !== cfg.trigger_secret) return errorResponse('forbidden', 403);

  const body = await req.json().catch(() => ({}));
  const id = Number(body.outbox_id);
  if (!Number.isInteger(id)) return errorResponse('bad_request');
  const { data: row } = await db.from('admin_email_outbox').select('*').eq('id', id).maybeSingle();
  if (!row || row.sent_at) return json({ ok: true, skipped: true });

  const fail = async (error: string) => {
    await db.from('admin_email_outbox').update({ error }).eq('id', id);
    return json({ ok: false, error });
  };

  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return fail('RESEND_API_KEY not set');
  const { data: setting } = await db.from('settings').select('value').eq('key', 'admin_notify_emails').maybeSingle();
  const to = (Array.isArray(setting?.value) ? setting!.value : []).map(String).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (!to.length) return fail('no admin_notify_emails');

  const { subject, html } = build(row.kind, row.payload ?? {});
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) return fail(`resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
  await db.from('admin_email_outbox').update({ sent_at: new Date().toISOString(), recipients: to, error: null }).eq('id', id);
  return json({ ok: true });
});
