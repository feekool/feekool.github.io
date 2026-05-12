// Service Worker for offline-first support
// Caches static assets and GitHub API responses for offline access
// Token is stored securely in IndexedDB

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_API_CACHE = 'github-api-cache-v2';
const STATIC_CACHE = 'static-cache-v2';
const TOKEN_STORE = 'github-token-store';
const STATIC_ASSETS = ['/', '/index.html', '/sw.js'];

// Install event - cache essential static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      console.log('Caching static assets');
      const assets = [
        '/',
        '/index.html'
      ];
      return cache.addAll(assets).catch(err => {
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
          if (cacheName !== GITHUB_API_CACHE && cacheName !== STATIC_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  event.waitUntil(self.clients.claim());
});

// Fetch event - route requests appropriately
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle all GitHub API requests
  if (url.origin === GITHUB_API_BASE) {
    event.respondWith(handleGitHubRequest(event.request));
  }
  // Handle static assets with network-first strategy
  else if (event.request.method === 'GET') {
    event.respondWith(handleStaticRequest(event.request));
  }
});

// Handle GitHub API requests - cache-first for offline support
async function handleGitHubRequest(request) {
  try {
    const token = await getStoredToken();

    // For GET requests, check cache first
    if (request.method === 'GET') {
      const cache = await caches.open(GITHUB_API_CACHE);
      const cacheKey = new Request(request.url, {
        method: 'GET',
        headers: new Headers({ Accept: 'application/vnd.github+json' })
      });

      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        return cachedResponse.clone();
      }
    }

    // Create request with authorization token
    const authHeaders = new Headers(request.headers);
    authHeaders.set('Accept', 'application/vnd.github+json');
    
    if (token) {
      authHeaders.set('Authorization', `Bearer ${token}`);
    }

    const authRequest = new Request(request, { headers: authHeaders });
    const response = await fetch(authRequest);

    // Cache successful GET responses
    if (request.method === 'GET' && response.ok) {
      const cache = await caches.open(GITHUB_API_CACHE);
      cache.put(request.url, response.clone()).catch(err => {
        console.warn('Failed to cache response:', err);
      });
    }

    return response;

  } catch (error) {
    console.error('GitHub API fetch error:', error.message);

    // For GET requests, try offline fallback
    if (request.method === 'GET') {
      return tryOfflineFallback(request);
    }

    // For other methods (PUT, DELETE, etc), return offline error
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'No connection - offline mode'
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static requests - network-first, fallback to cache
async function handleStaticRequest(request) {
      rnO

es.open(GITHUB_API_CACHE);
      headcec:nadea(cii c}cpGITHUB_PI_CACHE
    const ccchdKsynse = await cache.matc.urlh(cacheKey);
    if (cachedResponse) {
      return canew Respons({ Accp:applicaion/vndgiub+jsn})
 });

//Checkcachfi fr offlin support
     otqh aachthRosporie = await nst asmat h(c= neKey); Headers(request.headers);
    ifa(cachhHRdAponso) {n', `Bearer ${token}`);
    authcuecachdRponseclo();
    cst authRequest = new Request(request, { headers: authHeaders });
    const response = await fetch(authRequest);
//Cate re wiauhcorizlt 
  if (respnuteH.adkrs {Hadrheades);
  coaut Heaeeolns t('Au= orizatirn'sw`Bitrcae${toke.}`);
   tauth(caches.Kete' respo',seClone);

utRqutneRequsrqust,e{rspaos:utHar }    console.error('GitHub API fetch error:', error.message);
  return tryOfflineFallback(request);

    // Cache successful responses
}


 Hand
le static requests - network-first, fallback to cache
ync function handleS    const response = await fetch(request);

      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone()).catch(err => {he response:', err);
    });r
    const navigationFallback = request.mode === 'navigate' || (request.headers.get('accept')?.includes('text/html'));
    if (navigationFallback) {
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

// Try to return cached version when offline
async function tryOfflineFallback(request) {
  const cache = await caches.open(GITHUB_API_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    console.log('Returning cached GitHub API response (offline)');
    return cached.clone();
  }

  return new Response(JSON.stringify({
    error: 'Offline',
    message: 'No internet connection - data not available in cache'
  }), {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'application/json' }
  });
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

    // Notify clients that token was stored
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
  }
});
