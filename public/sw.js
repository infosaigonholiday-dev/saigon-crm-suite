/* Saigon Holiday CRM — Web Push Service Worker */
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('push', (e) => {
  let data = {};
  try {
    data = e.data ? e.data.json() : {};
  } catch {
    data = { title: 'Saigon Holiday', message: e.data ? e.data.text() : '' };
  }
  const title = data.title || 'Saigon Holiday CRM';
  const options = {
    body: data.message || '',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    data: { url: data.url || '/' },
    tag: data.tag || 'sh-notify',
    requireInteraction: false,
  };
  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        try {
          const u = new URL(c.url);
          if (u.pathname === target || c.url.includes(target)) {
            return c.focus();
          }
        } catch {}
      }
      return self.clients.openWindow(target);
    })
  );
});
