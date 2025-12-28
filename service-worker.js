const CACHE_NAME = 'futtag-cache-v3.2.5'; // ✅ VERSÃO MAIOR
const urlsToCache = [
    './',
    './index.html',
    './app.js',
    './style.css',
    './manifest.json',
    './icons/icon-180.png',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Forçar atualização do cache
self.addEventListener('install', event => {
    console.log('🔄 Service Worker instalando versão v3.2.5...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Cache aberto v3.2.5');
                return cache.addAll(urlsToCache);
            })
    );
    self.skipWaiting(); // ✅ FORÇA ATIVAÇÃO IMEDIATA
});

// Limpar cache antigo
self.addEventListener('activate', event => {
    console.log('🗑️ Service Worker ativando e limpando cache antigo...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('��️ Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim(); // ✅ ASSUME CONTROLE IMEDIATO
});

// Sempre buscar da rede primeiro para arquivos principais
self.addEventListener('fetch', event => {
    const url = event.request.url;
    
    // Para arquivos principais, sempre buscar da rede primeiro
    if (url.includes('app.js') || url.includes('index.html') || url.includes('style.css')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(event.request, responseClone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
    } else {
        // Para outros arquivos, usar cache primeiro
        event.respondWith(
            caches.match(event.request)
                .then(response => response || fetch(event.request))
        );
    }
});