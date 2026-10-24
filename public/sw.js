const CACHE = 'aftercare-public-v1';
const ASSETS = ['/offline.html', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', event => { event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))); self.skipWaiting(); });
self.addEventListener('activate', event => { event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== 'GET') return;
  // Never cache care data, API responses, authenticated HTML, or credentials.
  if (event.request.mode === 'navigate') { event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html'))); return; }
  if (ASSETS.includes(url.pathname)) event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
self.addEventListener('push', event => {
  let payload = { title: 'After Care', body: 'A reminder is ready in your care plan.', url: '/', tag: 'aftercare' };
  try { payload = { ...payload, ...event.data.json() }; } catch (_) {}
  event.waitUntil(self.registration.showNotification(payload.title, { body: payload.body, icon: '/icon-192.png', badge: '/icon-192.png', tag: payload.tag, data: { url: '/' } }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const existing = clients.find(client => new URL(client.url).origin === self.location.origin);
    if (existing) { await existing.navigate('/'); return existing.focus(); }
    return self.clients.openWindow('/');
  }));
});
