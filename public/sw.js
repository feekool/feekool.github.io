// Service Worker for offline-first support
// Caches static assets and GitHub API responses for offline access
// Token is stored securely in IndexedDB

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_API_CACHE = 'github-api-cache-v2';
const STATIC_CACHE = 'static-cache-v2';
const EXTERNAL_CACHE = 'external-cache-v1';
const TOKEN_STORE = 'github-token-store';

// Install event - cache essential static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('Caching static assets');
      return cache.addAll(['/', '/index.html']).catch(err => {
        console.warn('Some static assets failed to cache:', err);
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== GITHUB_API_CACHE && cacheName !== STATIC_CACHE && cacheName !== EXTERNAL_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - route requests appropriately
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't intercept non-GET requests to our own origin (they should go directly)
  if (url.origin === location.origin && event.request.method !== 'GET') {
    return;
  }

  // Handle all GitHub API requests
  if (url.origin === GITHUB_API_BASE) {
    event.respondWith(handleGitHubRequest(event.request));
    return;
  }

  // Allow external resources to pass through without caching scripts
  if (event.request.method === 'GET') {
    // For gravatar images - cache them
    if ((url.hostname.includes('gravatar.com') || url.hostname.includes('www.gravatar.com')) && 
        event.request.destination === 'image') {
      event.respondWith(
        caches.open(EXTERNAL_CACHE).then(cache => {
          return cache.match(event.request).then(cached => {
            return fetch(event.request)
              .then(response => {
                if (response && response.status === 200) {
                  cache.put(event.request, response.clone());
                }
                return response;
              })
              .catch(() => cached || new Response('', { status: 204 }));
          });
        })
      );
      return;
    }

    // For umnico and other external resources - network only
    if (url.hostname.includes('umnico.com') || url.hostname.includes('www.umnico.com')) {
      event.respondWith(
        fetch(event.request).catch(() => new Response('', { status: 204 }))
      );
      return;
    }

    // Handle static assets with network-first strategy
    event.respondWith(handleStaticRequest(event.request));
  }
});

// Handle GitHub API requests - network first, cache fallback
async function handleGitHubRequest(request) {
  // Не перехватываем не-GET запросы
  if (request.method !== 'GET') {
    return fetch(request);
  }

  try {
    const token = await getStoredToken();
    
    // Создаем запрос с авторизацией
    const headers = new Headers();
    headers.set('Accept', 'application/vnd.github+json');
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Копируем оригинальные заголовки запроса
    const originalHeaders = new Headers(request.headers);
    originalHeaders.forEach((value, key) => {
      if (key !== 'authorization' && key !== 'accept') {
        headers.set(key, value);
      }
    });

    const newRequest = new Request(request, { headers });
    
    // Пытаемся получить свежие данные из сети
    const response = await fetch(newRequest);
    
    if (response.ok) {
      // Кэшируем успешный ответ
      const cache = await caches.open(GITHUB_API_CACHE);
      cache.put(request.url, response.clone());
      console.log('Cached GitHub response:', request.url);
      return response;
    }
    
    throw new Error(`HTTP ${response.status}`);
    
  } catch (error) {
    console.log('Network error, trying cache:', error.message);
    
    // При ошибке сети пытаемся вернуть из кэша
    const cache = await caches.open(GITHUB_API_CACHE);
    const cachedResponse = await cache.match(request.url);
    
    if (cachedResponse) {
      console.log('Returning cached response for:', request.url);
      return cachedResponse;
    }
    
    // Нет ни сети, ни кэша
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'No internet connection and no cached data available'
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static requests - network-first, fallback to cache
async function handleStaticRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone()).catch(err => {
        console.warn('Failed to cache response:', err);
      });
      return response;
    }
    throw new Error('Network response not ok');
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Для навигационных запросов возвращаем index.html
    if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
      const shell = await caches.match('/index.html');
      if (shell) {
        return shell;
      }
    }

    return new Response('Offline - Resource unavailable', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Get token from IndexedDB
async function getStoredToken() {
  try {
    const db = await openTokenDB();
    const transaction = db.transaction([TOKEN_STORE], 'readonly');
    const store = transaction.objectStore(TOKEN_STORE);
    const request = store.get('github-token');

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result?.token || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get token from storage:', error);
    return null;
  }
}

// Store token in IndexedDB
async function storeToken(token) {
  try {
    const db = await openTokenDB();
    const transaction = db.transaction([TOKEN_STORE], 'readwrite');
    const store = transaction.objectStore(TOKEN_STORE);
    await store.put({ id: 'github-token', token, timestamp: Date.now() });

    // Notify clients
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({ type: 'TOKEN_STORED' });
      });
    });

    console.log('Token stored securely in service worker');
  } catch (error) {
    console.error('Failed to store token:', error);
  }
}

// Open IndexedDB for token storage
function openTokenDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GitHubTokenDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(TOKEN_STORE)) {
        db.createObjectStore(TOKEN_STORE, { keyPath: 'id' });
      }
    };
  });
}

// Message handling for token management
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_TOKEN') {
    storeToken(event.data.token);
  } else if (event.data && event.data.type === 'CLEAR_CACHE') {
    Promise.all([
      caches.delete(GITHUB_API_CACHE),
      caches.delete(STATIC_CACHE)
    ]).then(() => {
      console.log('All service worker caches cleared');
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      });
    });
  } else if (event.data && event.data.type === 'CLEAR_TOKEN') {
    openTokenDB().then(db => {
      const transaction = db.transaction([TOKEN_STORE], 'readwrite');
      const store = transaction.objectStore(TOKEN_STORE);
      store.delete('github-token');
    });
  } else if (event.data && event.data.type === 'REFRESH_CACHE') {
    // Принудительно обновляем кэш для конкретного URL
    caches.open(GITHUB_API_CACHE).then(cache => {
      cache.delete(event.data.url).then(() => {
        console.log('Cache cleared for:', event.data.url);
      });
    });
  }
});
