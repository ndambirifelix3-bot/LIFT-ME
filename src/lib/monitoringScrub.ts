/**
 * Privacy for error reports: remove anything that could identify a person before it leaves the phone.
 * - Addresses lose their "?…" part (e.g. /otp?phone=… becomes /otp).
 * - Long digit runs (phone numbers, M-Pesa numbers) become "[number]".
 */
const PHONE = /\+?\d[\d\s-]{7,}\d/g;

function cleanUrl(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  return value.split('?')[0].replace(PHONE, '[number]');
}

function cleanText(value: unknown): unknown {
  return typeof value === 'string' ? value.replace(PHONE, '[number]') : value;
}

type Crumb = { message?: string; data?: Record<string, unknown> };

export function scrubBreadcrumb<T extends Crumb>(crumb: T): T {
  if (crumb.message) crumb.message = cleanText(crumb.message) as string;
  if (crumb.data) {
    for (const key of ['from', 'to', 'url']) if (key in crumb.data) crumb.data[key] = cleanUrl(crumb.data[key]);
    if (Array.isArray(crumb.data.arguments)) crumb.data.arguments = crumb.data.arguments.map(cleanText);
  }
  return crumb;
}

type Ev = { user?: { id?: string }; request?: { url?: string; query_string?: unknown }; message?: string; breadcrumbs?: Crumb[] };

export function scrubEvent<T extends Ev>(event: T): T {
  if (event.user) event.user = { id: event.user.id };
  if (event.request) {
    event.request.url = cleanUrl(event.request.url) as string | undefined;
    delete event.request.query_string;
  }
  if (event.message) event.message = cleanText(event.message) as string;
  event.breadcrumbs?.forEach(scrubBreadcrumb);
  return event;
}
