// Nome e versão do cache
const CACHE_NAME = 'equidade-clinic-v1';

// Lista de recursos para armazenar em cache para funcionalidade offline básica
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/index.css',
  '/assets/index.js',
  '/assets/images/logo.png',
  '/assets/images/fallback.png',
  '/manifest.json'
];

// Lista de endpoints de API a serem armazenados em cache
const API_ROUTES = [
  '/api/user', 
  '/api/facilities',
  '/api/professionals'
];

// Instalação: pré-armazenar recursos estáticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação: limpar caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((cacheName) => {
          return cacheName !== CACHE_NAME;
        }).map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estratégia de cachear primeiro e depois fazer rede para recursos estáticos
async function cacheFirstThenNetwork(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    // Apenas cache recursos válidos (código 200) e não-CORS
    if (networkResponse.ok && networkResponse.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Erro de fetch:', error);
    
    // Fallback para página offline quando recursos primários falham
    if (request.mode === 'navigate') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/offline.html') || new Response('Você está offline e não temos uma página offline para mostrar.', {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Fallback para imagem placeholder quando imagens falham
    if (request.destination === 'image') {
      const cache = await caches.open(CACHE_NAME);
      return cache.match('/assets/images/fallback.png');
    }
    
    // Outros recursos simplesmente falham em modo offline
    return new Response('Falha ao carregar recurso quando offline', { status: 408 });
  }
}

// Estratégia de rede primeiro e depois cache para API
async function networkFirstThenCache(request) {
  try {
    // Primeiro tentamos da rede
    const networkResponse = await fetch(request);
    
    // Cache de resposta de API bem-sucedida
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Falha na rede, tentando do cache para:', request.url);
    
    // Se falhar, tentamos do cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Se não tivermos no cache, retornamos um erro de API 
    return new Response(
      JSON.stringify({ 
        error: 'Você está offline e os dados solicitados não estão disponíveis no cache.',
        offline: true 
      }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
}

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Não cachear requisições não-GET
  if (event.request.method !== 'GET') {
    return;
  }

  // Tratar solicitações de API
  if (url.pathname.startsWith('/api/')) {
    // Verificar se é uma rota de API que deve ser cacheada
    const isCacheableAPI = API_ROUTES.some(route => 
      url.pathname === route || url.pathname.startsWith(`${route}/`)
    );
    
    if (isCacheableAPI) {
      event.respondWith(networkFirstThenCache(event.request));
    } else {
      // Para rotas de API não cacheáveis, apenas tentamos da rede
      return;
    }
  } 
  // Tratar recursos estáticos e navegação
  else {
    event.respondWith(cacheFirstThenNetwork(event.request));
  }
});

// Sincronização em segundo plano
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-data') {
    event.waitUntil(syncPendingData());
  }
});

// Lógica para sincronizar dados pendentes quando voltamos online
async function syncPendingData() {
  try {
    // Abrir o IndexedDB para obter os dados pendentes
    const pendingRequestsDb = await openIndexedDB('pending-requests', 1);
    const pendingRequests = await getAllPendingRequests(pendingRequestsDb);
    
    if (pendingRequests.length === 0) {
      return;
    }
    
    // Processar cada solicitação pendente
    for (const request of pendingRequests) {
      try {
        const response = await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body,
          mode: 'cors',
          credentials: 'include'
        });
        
        if (response.ok) {
          // Se for bem-sucedida, removemos do banco
          await removePendingRequest(pendingRequestsDb, request.id);
          
          // Notificar o cliente de que a sincronização foi bem-sucedida
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'SYNC_SUCCESS',
                payload: {
                  requestId: request.id,
                  url: request.url
                }
              });
            });
          });
        }
      } catch (error) {
        console.error('Erro ao sincronizar dados:', error);
      }
    }
  } catch (error) {
    console.error('Erro ao abrir banco de dados para sincronização:', error);
  }
}

// Funções auxiliares para IndexedDB
function openIndexedDB(name, version) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    };
    
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

function getAllPendingRequests(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['requests'], 'readonly');
    const store = transaction.objectStore('requests');
    const request = store.getAll();
    
    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}

function removePendingRequest(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['requests'], 'readwrite');
    const store = transaction.objectStore('requests');
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
}

// Receber mensagens do cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});