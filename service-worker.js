// ***** MUDE ESTE NÚMERO PARA UM VALOR MAIOR A CADA NOVA PUBLICAÇÃO! *****
const CACHE_VERSION = 48; // << VERSÃO ATUALIZADA PARA FUTTAG PRO v3.2 (após atualização do app.js e styles.css)
// **********************************************************************
const CACHE_NAME = `futtag-pro-cache-v${CACHE_VERSION}`;

const URLS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.json',
  // Ícones
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Bibliotecas externas para funcionar offline
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];
// Instalação: pré-cacheia os recursos
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing FutTag Pro v3.2 Service Worker v${CACHE_VERSION}...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`[SW] Cache ${CACHE_NAME} opened, adding URLs...`);
        return Promise.allSettled(
          URLS_TO_CACHE.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[SW] Failed to cache ${url}:`, err);
              return Promise.resolve(); // Continue mesmo que uma URL falhe
            })
          )
        );
      })
      .then(() => self.skipWaiting()) // Força o novo Service Worker a assumir o controle imediatamente
      .catch(error => console.error('[SW] Install failed:', error))
  );
});

// Ativação: limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating FutTag Pro v3.2 Service Worker v${CACHE_VERSION}...`);
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => 
          name.startsWith('futtag-pro-cache-v') && 
          name !== CACHE_NAME
        ).map(name => {
          console.log(`[SW] Deleting old cache: ${name}`);
          return caches.delete(name);
        })
      );
    })
    .then(() => self.clients.claim()) // Permite que o Service Worker controle imediatamente a página
    .catch(error => console.error('[SW] Activate failed:', error))
  );
});

// Fetch: estratégia de cache-first com fallback inteligente
self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Ignora extensões de navegador e métodos não GET
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension://') || 
      request.url.startsWith('moz-extension://') || request.url.startsWith('safari-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(cachedResponse => {
        // Se houver resposta em cache, retorna.
        if (cachedResponse) {
          // Para bibliotecas externas (CDNs), tenta atualizar o cache em segundo plano.
          // Isso é uma estratégia "stale-while-revalidate" para esses recursos.
          if (request.url.includes('cdn.jsdelivr.net') || request.url.includes('cdnjs.cloudflare.com')) {
            fetch(request).then(response => {
              if (response.ok) { // Apenas cacheia respostas válidas
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(request, response.clone());
                });
              }
            }).catch(() => { /* Ignora erros de rede em segundo plano */ });
          }
          return cachedResponse;
        }
        
        // Se não houver em cache, tenta a rede.
        return fetch(request).then(networkResponse => {
          if (networkResponse.ok) { // Apenas cacheia respostas válidas
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Se falhar na rede, e for uma navegação (carregamento de página HTML),
          // tenta retornar o index.html do cache (útil para "offline first").
          if (request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          // Para outros recursos que não estão em cache nem na rede, retorna uma resposta de offline.
          return new Response('Offline - Resource not available', {
            status: 404,
            statusText: 'Offline'
          });
        });
      })
  );
});

// Listener para a mensagem 'SKIP_WAITING' (útil para atualizar o SW via UI)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});