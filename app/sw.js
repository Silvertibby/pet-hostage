// Pet Hostage service worker: push notifications + network-first offline cache.
const CACHE = 'ph-v0.3.3';
const ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'art.js', 'icons/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {})); self.skipWaiting(); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // Worker API (workers.dev) and anything cross-origin: network-only, never cached.
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.hostname.endsWith('workers.dev')) return;
  if (u.pathname.endsWith('/sw.js')) return;
  e.respondWith(fetch(e.request, { cache: 'no-cache' }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
    .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html'))));
});
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || '🦝 The Raccoon', {
    body: d.body || 'Your bunny says hi.', tag: d.tag || 'ph', icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url: d.url || self.registration.scope },
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) if ('focus' in c) return c.focus();
    return self.clients.openWindow(e.notification.data?.url || self.registration.scope);
  }));
});
