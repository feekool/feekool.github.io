// Service Worker for offline-first support
// Caches static assets and GitHub API responses for offline access
// Token is stored securely in IndexedDB

const GITHUB_API_BASE = 'https://api.github.com';
const GITHUB_API_CACHE = 'github-api-cache-v3'; // Updated version
const STATIC_CACHE = 'static-cache-v3';
const EXTERNAL_CACHE = 'external-cache-v2';
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

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== GITHUB_API_CACHE && cacheName !== STATIC_CACHE && cacheName !== EXTERNAL_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Fetch event - route requests appropriately
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Don't intercept non-GET requests to our own origin (they should go directly)
  if (url.origin === location.origin && event.request.method !== 'GET') {
    return;
  }

  // Handle all GitHub API requests with network-first strategy
  if (url.origin === GITHUB_API_BASE) {
    event.respondWith(handleGitHubRequest(event.request));
    return;
  }

  // Allow external resources to pass through without caching scripts
  // Only handle if method is GET
  if (event.request.method === 'GET') {
    // For gravatar images - cache them, but let umnico and other scripts pass through
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

    // For umnico and other external resources - network only, don't cache scripts
    if (url.hostname.includes('umnico.com') || url.hostname.includes('www.umnico.com')) {
      event.respondWith(
        fetch(event.request)
          .catch(() => new Response('', { status: 204 }))
      );
      return;
    }

    // Handle static assets with network-first strategy
    event.respondWith(handleStaticRequest(event.request));
  }
});

// Handle GitHub API requests - network-first for fresh data, cache for offline
async function handleGitHubRequest(request) {
  const url = new URL(request.url);
  
  // Check if this is a request for user posts/issues
  const isUserContentRequest = url.pathname.includes('/issues') || 
                                url.pathname.includes('/posts') ||
                                (url.pathname.includes('/repos/') && url.pathname.includes('/contents/'));
  
  try {
    const token = await getStoredToken();

    // Create request with authorization token
    const authHeaders = new Headers();
    authHeaders.set('Accept', 'application/vnd.github+json');
    authHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    authHeaders.set('Pragma', 'no-cache');
    
    if (token) {
      authHeaders.set('Authorization', `Bearer ${token}`);
    }

    const authRequest = new Request(request, { 
      headers: authHeaders,
      cache: 'no-store' // Don't use HTTP cache
    });
    
    // Network-first strategy for fresh data
    const response = await fetch(authRequest);
    
    // Cache successful GET responses (especially important for posts)
    if (request.method === 'GET' && response.ok) {
      const cache = await caches.open(GITHUB_API_CACHE);
      // Clone response before caching
      const responseToCache = response.clone();
      await cache.put(request.url, responseToCache);
      console.log('Cached fresh response for:', request.url);
    }
    
    return response;

  } catch (error) {
    console.error('GitHub API fetch error:', error.message);

    // For GET requests, try offline fallback from cache
    if (request.method === 'GET') {
      const cachedResponse = await tryOfflineFallback(request);
      if (cachedResponse) {
        console.log('Returning cached data for:', request.url);
        return cachedResponse;
      }
    }

    // Return offline error
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'No connection - using cached data if available'
    }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static requests - network-first with cache fallback
async function handleStaticRequest(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
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
      console.log('Returning cached static asset:', request.url);
      return cached;
    }

    // Fallback to index.html for navigation requests
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
  const cached = await cache.match(request.url);
  if (cached) {
    console.log('Returning cached GitHub API response (offline)');
    return cached.clone();
  }
  return null;
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
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({ type: 'TOKEN_STORED', token: token });
    });

    console.log('Token stored securely in service worker');
  } catch (error) {
    console.error('Failed to store token:', error);
  }
}

// Clear all caches and force refresh
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('All caches cleared');
}

// Force refresh GitHub cache for specific endpoint
async function refreshGitHubCache(url) {
  const cache = await caches.open(GITHUB_API_CACHE);
  await cache.delete(url);
  console.log('Cache cleared for:', url);
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

// Message handling for token management and cache control
self.addEventListener('message', (event) => {
  const { data } = event;
  
  if (data && data.type === 'SET_TOKEN') {
    storeToken(data.token);
  } 
  else if (data && data.type === 'CLEAR_CACHE') {
    clearAllCaches().then(() => {
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
    refreshGitHubCache(data.url).then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'CACHE_REFRESHED', url: data.url });
        });
      });
    });
  }
  else if (data && data.type === 'FORCE_REFRESH') {
    // Force refresh all GitHub API caches
    caches.open(GITHUB_API_CACHE).then(cache => {
      cache.keys().then(keys => {
        keys.forEach(key => {
          cache.delete(key);
        });
      });
    }).then(() => {
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'FORCE_REFRESH_COMPLETE' });
        });
      });
    });
  }
  else if (data && data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync for offline posts
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPendingPosts());
  }
});

async function syncPendingPosts() {
  console.log('Syncing pending posts...');
  const token = await getStoredToken();
  if (!token) return;
  
  // Here you can implement retry logic for failed posts
  const db = await openPendingPostsDB();
  const pendingPosts = await getPendingPosts(db);
  
  for (const post of pendingPosts) {
    try {
      const response = await fetch(post.url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github+json'
        },
        body: JSON.stringify(post.data)
      });
      
      if (response.ok) {
        await deletePendingPost(db, post.id);
        console.log('Post synced successfully:', post.id);
      }
    } catch (error) {
      console.error('Failed to sync post:', error);
    }
  }
}

// Helper functions for pending posts storage
function openPendingPostsDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('PendingPostsDB', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending-posts')) {
        db.createObjectStore('pending-posts', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

async function getPendingPosts(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-posts'], 'readonly');
    const store = transaction.objectStore('pending-posts');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function deletePendingPost(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-posts'], 'readwrite');
    const store = transaction.objectStore('pending-posts');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
