const CACHE_VERSION = 'v3'; // aumente para v4, v5... quando mudar algo importante
const CACHE_NAME = `hud-timer-cache-${CACHE_VERSION}`;

const URLS_TO_CACHE = [
  './',
  './Users/carlosbonin/Documents/Projeto tagueamento/hud-timer-pwa/index.html',
  './Users/carlosbonin/Documents/Projeto tagueamento/hud-timer-pwa/styles.css',
  './Users/carlosbonin/Documents/Projeto tagueamento/hud-timer-pwa/app.js',
  './Users/carlosbonin/Documents/Projeto tagueamento/hud-timer-pwa/manifest.webmanifest',
  './Users/carlosbonin/Documents/Projeto tagueamento/hud-timer-pwa/icons/192.png',
  './Users/carlosbonin/Documents/Projeto tagueamento/hud-timer-pwa/icons/180.png',
  './Users/carlosbonin/Documents/Projeto tagueamento/hud-timer-pwa/icons/192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match('./')); // fallback: index.html
    })
  );
});