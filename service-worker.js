// ***** MUDE ESTE NÚMERO PARA UM VALOR MAIOR A CADA NOVA PUBLICAÇÃO! *****
const CACHE_VERSION = 20; // << VERSÃO ATUALIZADA PARA FUTTAG PRO
// **********************************************************************
const CACHE_NAME = `futtag-pro-cache-v${CACHE_VERSION}`;

const URLS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  // Ícones (ajuste a lista conforme os arquivos que você tem na pasta icons/)
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Chart.js CDN será cacheado automaticamente quando acessado
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
];

// Instalação: pré-cacheia os recursos
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing FutTag Pro Service Worker v${CACHE_VERSION}...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`[SW] Cache ${CACHE_NAME} opened, adding URLs...`);
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting()) // Força o service worker a ativar imediatamente
      .catch(error => console.error('[SW] Cache.addAll failed:', error))
  );
});

// Ativação: limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating FutTag Pro Service Worker v${CACHE_VERSION}...`);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name.startsWith('futtag-pro-cache-v') && name !== CACHE_NAME)
          .map(name => {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim()) // Permite que o novo SW controle os clientes imediatamente
    .catch(error => console.error('[SW] Activate failed:', error))
  );
});

// Fetch: estratégia de cache-first (depois network)
self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Apenas lida com requisições GET
  if (request.method !== 'GET') {
    return;
  }

  // Verifica se a requisição está no cache, senão tenta da rede
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      // Se encontrou no cache, retorna
      if (cachedResponse) {
        return cachedResponse;
      }
      // Senão, tenta buscar da rede
      return fetch(request).then(networkResponse => {
        // Clona a resposta para poder armazenar no cache e retornar ao cliente
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // Fallback offline (se a requisição falhar e não estiver no cache, retorna a página principal)
        return caches.match('./'); // Garante que a página principal esteja sempre disponível offline
      });
    })
  );
});

// Notificação de atualização disponível
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});