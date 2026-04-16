// =====================================================
// SPRINT TIMER PRO — SERVICE WORKER v2.0
// =====================================================

const CACHE_NAME = 'sprint-timer-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ── INSTALL: Cache semua aset penting ──
self.addEventListener('install', event => {
  console.log('[SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: Buang cache lama ──
self.addEventListener('activate', event => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ── FETCH: Network-first untuk Firebase, Cache-first untuk aset ──
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase & CDN — sentiasa ambil dari network (data realtime)
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('firebaseio') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('cloudflare') ||
    url.hostname.includes('tailwindcss') ||
    url.hostname.includes('cdnjs')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // Jika tiada internet, cuba dari cache
        return caches.match(event.request);
      })
    );
    return;
  }

  // Aset tempatan — Cache-first, fallback ke network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Update cache di background
        fetch(event.request).then(response => {
          if (response && response.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, response.clone());
            });
          }
        }).catch(() => {});
        return cached;
      }

      // Tiada dalam cache, ambil dari network
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Fallback: halaman offline mudah
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// ── SYNC: Background sync jika ada (untuk masa depan) ──
self.addEventListener('sync', event => {
  console.log('[SW] Background sync:', event.tag);
});

// ── PUSH: Notifikasi push (untuk masa depan) ──
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  self.registration.showNotification(data.title || 'Sprint Timer', {
    body: data.body || 'Notifikasi dari Sprint Timer',
    icon: './icons/icon-192.png',
    badge: './icons/icon-72.png'
  });
});
