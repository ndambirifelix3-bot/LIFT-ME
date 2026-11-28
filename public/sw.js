/* Lift Me service worker.
 *
 * Rule: only the app's OWN files are cached (code, fonts, icons). Anything from Supabase, Google or
 * M-Pesa always goes to the network — ride status, prices and payments must never be stale.
 *
 * - Page loads: network first; with no connection, show the offline page below.
 * - /_expo/static/* and /assets/*: file names contain a content hash, so cache first (fast, safe).
 * - Other files (icons, manifest): use the cache, refresh it in the background.
 *
 * - Opening the app: latest page from the server, or the saved copy if the network is slow (see openPage).
 * Bump VERSION to force every phone to drop the old cache.
 */
const VERSION = 'v3'; // v3: drops caches that may hold a page saved in place of a missing app file
const CACHE = `liftme-${VERSION}`;
const PRECACHE = ['/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/brand/splash-logo.png'];
// Last good copy of the main page (the same for every address), used when the network is slow.
const SHELL = '/__liftme-shell';
const SLOW_NETWORK_MS = 2500;
const MAX_HASHED_FILES = 120; // old app versions' files are trimmed beyond this

// The offline page lives inside this file rather than as offline.html: some hosts rewrite or
// redirect .html addresses, which made a cached copy unreliable.
const OFFLINE_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#101010" />
    <title>Lift Me — offline</title>
    <style>
      html, body { height: 100%; margin: 0; }
      body {
        background: #101010; color: #ffffff;
        font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        display: flex; align-items: center; justify-content: center; text-align: center; padding: 24px;
        box-sizing: border-box;
      }
      main { max-width: 360px; }
      img { width: 120px; height: 120px; border-radius: 26px; }
      h1 { font-size: 22px; margin: 16px 0 8px; }
      p { color: #d9d9d9; line-height: 1.5; margin: 0 0 24px; }
      button {
        background: #ffc107; color: #101010; border: 0; border-radius: 12px;
        font: 600 16px Inter, system-ui, sans-serif; padding: 14px 28px; cursor: pointer;
      }
    </style>
  </head>
  <body>
    <main>
      <img src="/icons/icon-192.png" alt="Lift Me" />
      <h1>You're offline</h1>
      <p>Lift Me needs an internet connection to find drivers and show your trip. Check your data or Wi-Fi and try again.</p>
      <button onclick="location.reload()">Try again</button>
    </main>
    <script>
      // Reload automatically as soon as the connection comes back.
      window.addEventListener('online', function () { location.reload(); });
    </script>
  </body>
</html>`;

function offlinePage() {
  return new Response(OFFLINE_HTML, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('liftme-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase, Google, etc: straight to the network

  if (request.mode === 'navigate') {
    event.respondWith(openPage(request, event));
    return;
  }

  if (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (url.pathname === '/sw.js') return;
  event.respondWith(staleWhileRevalidate(request));
});

/**
 * Opening the app: ask the server for the latest page (`no-cache`), so updates arrive and "no internet"
 * is noticed reliably. But if the network is slow (no answer within 2.5 s) and we have a saved copy,
 * open the saved copy straight away; the fresh one is saved for next time.
 */
async function openPage(request, event) {
  const cache = await caches.open(CACHE);
  const network = fetch(request, { cache: 'no-cache' }).then((response) => {
    if (response.ok && (response.headers.get('content-type') || '').includes('text/html')) {
      cache.put(SHELL, response.clone());
    }
    return response;
  });
  event.waitUntil(network.catch(() => undefined));
  const saved = await cache.match(SHELL);
  if (!saved) return network.catch(offlinePage);
  const slow = new Promise((resolve) => setTimeout(() => resolve(null), SLOW_NETWORK_MS));
  try {
    return (await Promise.race([network, slow])) || saved;
  } catch {
    return offlinePage(); // no internet at all
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  // A file from an older app version that the server no longer has comes back as the main page
  // (text/html). Never save that, and report it as missing so the app reloads the new version.
  if ((response.headers.get('content-type') || '').includes('text/html')) {
    return new Response('Not found (the app was updated)', { status: 404, headers: { 'Content-Type': 'text/plain' } });
  }
  if (response.ok) {
    await cache.put(request, response.clone());
    trim(cache);
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || fresh;
}

async function trim(cache) {
  const keys = (await cache.keys()).filter((r) => {
    const path = new URL(r.url).pathname;
    return path.startsWith('/_expo/static/') || path.startsWith('/assets/');
  });
  // Oldest entries come first; drop them until we're under the limit.
  for (let i = 0; i < keys.length - MAX_HASHED_FILES; i++) await cache.delete(keys[i]);
}

// ---------------------------------------------------------------------------
// Push notifications (sent by the push-send Edge Function).
// Payload: { title, body, url, tag }. Same tag = replaces the older alert for that ride.
// ---------------------------------------------------------------------------
self.addEventListener('push', (event) => {
  let msg = {};
  try {
    msg = event.data ? event.data.json() : {};
  } catch {
    msg = { body: event.data ? event.data.text() : '' };
  }
  const title = msg.title || 'Lift Me';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: msg.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: msg.tag || undefined,
      renotify: !!msg.tag,
      data: { url: msg.url || '/' },
      vibrate: [200, 100, 200],
    }),
  );
});

// Tapping a notification opens Lift Me on the right screen (reusing an open tab if there is one).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (new URL(w.url).origin === self.location.origin && 'focus' in w) {
          return w.focus().then((focused) => (focused && 'navigate' in focused ? focused.navigate(target) : focused));
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
