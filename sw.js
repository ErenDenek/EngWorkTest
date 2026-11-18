const CACHE_NAME = 'linguaquest-pwa-v1';

const STATIC_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './defaultWords.js',
  './db.js',
  './gemini.js',
  './gameEngine.js',
  './ui.js',
  './manifest.json',
  './icon.svg',
  './oxford_3000.json'
];

const BYPASS_HOSTS = [
  'googleapis.com',
  'mymemory.translated.net',
  'dictionaryapi.dev'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        STATIC_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] Önbelleğe alma atlandı:', url, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((oldKey) => caches.delete(oldKey))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (_) {
    return;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (BYPASS_HOSTS.some((host) => url.hostname.includes(host))) {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  // Network-First stratejisi: güncel dosyayı ağdan al, çevrimdışıysa önbellekten sun
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.ok) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Çevrimdışı içerik bulunamadı.', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
