// Service Worker for offline-first support
// Caches static assets and GitHub API responses for offline access
// Supports PUT/POST/PATCH operations with offline queue
// Token is stored securely in IndexedDB

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_API_CACHE = 'github-api-cache-v3';
const STATIC_CACHE = 'static-cache-v3';
const EXTERNAL_CACHE = 'external-cache-v2';
const TOKEN_STORE = 'github-token-store';
const OFFLINE_QUEUE_STORE = 'offline-queue-store';

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
  const { method } = event.request;

  // Handle GitHub API requests
  if (url.origin === GITHUB_API_BASE) {
    // For non-GET requests (POST, PUT, PATCH, DELETE)
    if (method !== 'GET') {
      event.respondWith(handleGitHubWriteRequest(event.request));
      return;
    }
    // For GET requests
    event.respondWith(handleGitHubReadRequest(event.request));
    return;
  }

  // Don't intercept non-GET requests to our own origin
  if (url.origin === location.origin && method !== 'GET') {
    return;
  }

  // Handle external resources
  if (method === 'GET') {
    // For gravatar images - cache them
    if ((url.hostname.includes('gravatar.com') || url.hostname.includes('www.gravatar.com')) && 
        event.request.destination === 'image') {
      event.respondWith(handleGravatarRequest(event.request));
      return;
    }

    // For umnico and other external resources - network only
    if (url.hostname.includes('umnico.com') || url.hostname.includes('www.umnico.com')) {
      event.respondWith(fetch(event.request).catch(() => new Response('', { status: 204 })));
      return;
    }

    // Handle static assets
    event.respondWith(handleStaticRequest(event.request));
  }
});

// Handle GitHub write requests (POST, PUT, PATCH, DELETE)
async function handleGitHubWriteRequest(request) {
  try {
    const token = await getStoredToken();
    if (!token) {
      return new Response(JSON.stringify({
        error: true,
        message: 'Authentication required. Please set VITE_API_KEY.'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Clone the request to add authorization headers
    const headers = new Headers(request.headers);
    headers.set('Accept', 'application/vnd.github.v3+json');
    // Only set Authorization if not already present
    if (!headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    const authRequest = new Request(request, { headers });
    
    // Try to send the request
    const response = await fetch(authRequest);
    
    if (response.ok) {
      // Clear relevant caches after successful write
      await clearRelatedCaches(request.url);
      return response;
    }
    
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    
  } catch (error) {
    console.error('Write request failed:', error);
    
    // If offline or error, queue the request for later
    if (!navigator.onLine || error.message.includes('Failed to fetch')) {
      await queueOfflineRequest(request);
      return new Response(JSON.stringify({
        queued: true,
        message: 'Request queued for offline sync',
        originalUrl: request.url,
        method: request.method
      }), {
        status: 202,
        statusText: 'Accepted',
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Return error response
    return new Response(JSON.stringify({
      error: true,
      message: error.message
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle GitHub read requests (GET) - network first, cache fallback
async function handleGitHubReadRequest(request) {
  try {
    const token = await getStoredToken();
    
    // Create request with authorization
    const headers = new Headers();
    headers.set('Accept', 'application/vnd.github.v3+json');
    if (token && !request.headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    
    // Copy original headers
    const originalHeaders = new Headers(request.headers);
    originalHeaders.forEach((value, key) => {
      if (key !== 'authorization' && key !== 'accept') {
        headers.set(key, value);
      }
    });

    const authRequest = new Request(request, { headers });
    
    // Try network first
    const response = await fetch(authRequest);
    
    if (response.ok) {
      // Cache successful response
      const cache = await caches.open(GITHUB_API_CACHE);
      cache.put(request.url, response.clone());
      console.log('Cached GitHub response:', request.url);
      return response;
    }
    
    throw new Error(`HTTP ${response.status}`);
    
  } catch (error) {
    console.log('Network error, trying cache:', error.message);
    
    // Try cache
    const cache = await caches.open(GITHUB_API_CACHE);
    const cachedResponse = await cache.match(request.url);
    
    if (cachedResponse) {
      console.log('Returning cached response for:', request.url);
      return cachedResponse;
    }
    
    // No network, no cache
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

// Handle gravatar requests
async function handleGravatarRequest(request) {
  const cache = await caches.open(EXTERNAL_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return cached || new Response('', { status: 204 });
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

    // For navigation requests, return index.html
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

// Queue offline request
async function queueOfflineRequest(request) {
  try {
    const db = await openOfflineQueueDB();
    const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(OFFLINE_QUEUE_STORE);
    
    // Get request body
    let body = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        body = await request.clone().text();
      } catch (e) {
        console.warn('Could not read request body:', e);
      }
    }
    
    const queueItem = {
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: body,
      timestamp: Date.now(),
      retries: 0
    };
    
    await store.add(queueItem);
    console.log('Request queued for offline sync:', queueItem);
    
    // Register background sync if available
    await registerBackgroundSync();
    
  } catch (error) {
    console.error('Failed to queue offline request:', error);
  }
}

// Clear related caches after write operation
async function clearRelatedCaches(requestUrl) {
  try {
    const cache = await caches.open(GITHUB_API_CACHE);
    const keys = await cache.keys();
    
    // Extract repo path from URL
    const url = new URL(requestUrl);
    const pathParts = url.pathname.split('/');
    
    // Clear cache for list endpoints (e.g., /repos/owner/repo/issues)
    let basePath = '';
    for (let i = 0; i < pathParts.length; i++) {
      basePath += pathParts[i] + '/';
      await cache.delete(`${GITHUB_API_BASE}${basePath}`);
    }
    
    console.log('Cleared related caches for:', requestUrl);
  } catch (error) {
    console.warn('Failed to clear caches:', error);
  }
}

// Register background sync
async function registerBackgroundSync() {
  try {
    const registration = await self.registration;
    if ('sync' in registration) {
      await registration.sync.register('sync-offline-requests');
      console.log('Background sync registered');
    }
  } catch (error) {
    console.warn('Background sync not supported:', error);
  }
}

// Background sync event
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-requests') {
    event.waitUntil(syncOfflineRequests());
  }
});

// Sync offline requests when back online
async function syncOfflineRequests() {
  console.log('Syncing offline requests...');
  
  try {
    const token = await getStoredToken();
    if (!token) {
      console.log('No token available for sync');
      return;
    }
    
    const db = await openOfflineQueueDB();
    const pendingRequests = await getAllPendingRequests(db);
    
    console.log(`Found ${pendingRequests.length} pending requests to sync`);
    
    for (const request of pendingRequests) {
      try {
        // Recreate the request
        const headers = new Headers(request.headers);
        headers.set('Authorization', `Bearer ${token}`);
        headers.set('Accept', 'application/vnd.github.v3+json');
        
        const fetchOptions = {
          method: request.method,
          headers: headers
        };
        
        if (request.body) {
          fetchOptions.body = request.body;
        }
        
        const response = await fetch(request.url, fetchOptions);
        
        if (response.ok) {
          // Remove from queue on success
          await deletePendingRequest(db, request.id);
          console.log('Synced request:', request.url);
          
          // Notify clients
          const clients = await self.clients.matchAll();
          clients.forEach(client => {
            client.postMessage({
              type: 'REQUEST_SYNCED',
              url: request.url,
              method: request.method
            });
          });
        } else if (request.retries < 3) {
          // Increment retry count and keep in queue
          await updateRetryCount(db, request.id, request.retries + 1);
          console.log(`Retry ${request.retries + 1} for:`, request.url);
        } else {
          // Max retries exceeded, remove from queue
          await deletePendingRequest(db, request.id);
          console.error('Max retries exceeded for:', request.url);
        }
        
      } catch (error) {
        console.error('Failed to sync request:', request.url, error);
        
        if (request.retries >= 3) {
          await deletePendingRequest(db, request.id);
        } else {
          await updateRetryCount(db, request.id, request.retries + 1);
        }
      }
    }
    
  } catch (error) {
    console.error('Sync failed:', error);
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
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'TOKEN_STORED' });
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

// Open IndexedDB for offline queue
function openOfflineQueueDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineQueueDB', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(OFFLINE_QUEUE_STORE)) {
        const store = db.createObjectStore(OFFLINE_QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('retries', 'retries', { unique: false });
      }
    };
  });
}

// Get all pending requests
async function getAllPendingRequests(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readonly');
    const store = transaction.objectStore(OFFLINE_QUEUE_STORE);
    const request = store.getAll();
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// Delete pending request
async function deletePendingRequest(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(OFFLINE_QUEUE_STORE);
    const request = store.delete(id);
    
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Update retry count
async function updateRetryCount(db, id, retries) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([OFFLINE_QUEUE_STORE], 'readwrite');
    const store = transaction.objectStore(OFFLINE_QUEUE_STORE);
    const getRequest = store.get(id);
    
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.retries = retries;
        const putRequest = store.put(item);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Message handling
self.addEventListener('message', (event) => {
  const { data } = event;
  
  if (data && data.type === 'SET_TOKEN') {
    storeToken(data.token);
  } 
  else if (data && data.type === 'CLEAR_CACHE') {
    Promise.all([
      caches.delete(GITHUB_API_CACHE),
      caches.delete(STATIC_CACHE),
      caches.delete(EXTERNAL_CACHE)
    ]).then(() => {
      console.log('All service worker caches cleared');
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_CLEARED' });
        });
      });
    });
  } 
  else if (data && data.type === 'CLEAR_TOKEN') {
    openTokenDB().then(db => {
      const transaction = db.transaction([TOKEN_STORE], 'readwrite');
      const store = transaction.objectStore(TOKEN_STORE);
      store.delete('github-token');
    });
  }
  else if (data && data.type === 'REFRESH_CACHE') {
    caches.open(GITHUB_API_CACHE).then(cache => {
      cache.delete(data.url).then(() => {
        console.log('Cache cleared for:', data.url);
      });
    });
  }
  else if (data && data.type === 'GET_QUEUED_REQUESTS') {
    openOfflineQueueDB().then(async db => {
      const requests = await getAllPendingRequests(db);
      event.source.postMessage({
        type: 'QUEUED_REQUESTS',
        requests: requests
      });
    });
  }
  else if (data && data.type === 'SYNC_NOW') {
    event.waitUntil(syncOfflineRequests());
  }
  else if (data && data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Periodically sync when online
self.addEventListener('online', () => {
  console.log('Browser came online, syncing requests...');
  syncOfflineRequests();
});
