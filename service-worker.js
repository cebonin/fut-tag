const CACHE_NAME = 'futtag-cache-v3.2.7';
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
    console.log('🔄 Service Worker instalando versão v3.2.7...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 Cache aberto v3.2.7');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('❌ Erro ao abrir cache:', error);
            })
    );
    self.skipWaiting();
});

// Limpar cache antigo
self.addEventListener('activate', event => {
    console.log('🗑️ Service Worker ativando e limpando cache antigo...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ Removendo cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).catch(error => {
            console.error('❌ Erro ao limpar cache:', error);
        })
    );
    self.clients.claim();
});

// Sempre buscar da rede primeiro para arquivos principais
self.addEventListener('fetch', event => {
    const url = event.request.url;
    
    // Para arquivos principais, sempre buscar da rede primeiro
    if (url.includes('app.js') || url.includes('index.html') || url.includes('style.css')) {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    if (response && response.status === 200) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(event.request, responseClone))
                            .catch(error => console.error('❌ Erro ao salvar no cache:', error));
                    }
                    return response;
                })
                .catch(error => {
                    console.log('🔄 Fallback para cache:', event.request.url);
                    return caches.match(event.request);
                })
        );
    } else {
        // Para outros arquivos, usar cache primeiro
        event.respondWith(
            caches.match(event.request)
                .then(response => {
                    return response || fetch(event.request)
                        .catch(error => {
                            console.error('❌ Erro na requisição:', error);
                            return new Response('Erro de rede', { status: 503 });
                        });
                })
        );
    }
});

// Mensagem de atualização
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('✅ Service Worker v3.2.7 carregado');