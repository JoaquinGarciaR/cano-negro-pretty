// Service Worker para Caño Negro Pretty PWA (Notificaciones Push & PWA Standalone)
const CACHE_NAME = 'cano-negro-pretty-v4-clean';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Limpiar radicalmente cualquier caché previo para garantizar que no interfiera con Next.js HMR ni con assets
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

// NUNCA registrar listener 'fetch' para evitar que el Service Worker intercepte o sirva chunks obsoletos 404 de Next.js.

// Soporte para Notificaciones Push (Web Push API en iOS 16.4+ y Android)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (_) {
      data = { title: event.data.text() };
    }
  }

  const title = data.title || 'Caño Negro Pretty';
  const options = {
    body: data.body || 'Tienes una nueva cita o actualización en el salón',
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [200, 100, 200],
    data: data.url || '/admin'
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Al pulsar sobre la notificación, enfocar o abrir la pantalla administrativa
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data || '/admin';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/admin') && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
