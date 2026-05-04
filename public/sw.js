// Service Worker for API request proxying
// This intercepts GitHub API requests and adds authorization headers
// Token is stored securely in IndexedDB and retrieved by the worker

const GITHUB_API_BASE = 'https://api.github.com';
const CACHE_NAME = 'github-api-cache-v1';
const TOKEN_STORE = 'github-token-store';

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker installing.');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating.');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  event.waitUntil(self.clients.claim());
});

// Fetch event - intercept GitHub API requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only intercept GitHub API requests
  if (url.origin === GITHUB_API_BASE) {
    event.respondWith(handleGitHubRequest(event.request));
  }
});

// Handle GitHub API requests
async function handleGitHubRequest(request) {
  try {
    // Get the token from IndexedDB
    const token = await getStoredToken();

    if (!token) {
      console.warn('No token available for GitHub API request');
      return fetch(request);
    }

    // Create new request with authorization header
    const authRequest = new Request(request.url, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': request.headers.get('Content-Type') || 'application/json'
      },
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.clone().text(),
      mode: 'cors',
      credentials: 'omit'
    });

    // Make the request
    const response = await fetch(authRequest);

    // Return response (headers are sanitized by browser automatically)
    return response;

  } catch (error) {
    console.error('Service Worker fetch error:', error.message);
    return new Response(JSON.stringify({
      error: 'Network error',
      message: 'Failed to complete request'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
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
  } else if (event.data && event.data.type === 'CLEAR_TOKEN') {
    // Clear token from storage
    openTokenDB().then(db => {
      const transaction = db.transaction([TOKEN_STORE], 'readwrite');
      const store = transaction.objectStore(TOKEN_STORE);
      store.delete('github-token');
    });
  }
});