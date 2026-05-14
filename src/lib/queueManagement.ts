/**
 * Queue Management Module
 * Shared utilities for managing offline request queue in IndexedDB
 * Used by both frontend and Service Worker for 401/offline scenarios
 */

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
  retries: number;
}

const TOKEN_DB = 'GitHubTokenDB';
const QUEUE_DB = 'OfflineQueueDB';
const TOKEN_STORE = 'github-token-store';
const QUEUE_STORE = 'offline-queue-store';

/**
 * Open IndexedDB for token storage
 */
export function openTokenDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(TOKEN_DB, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(TOKEN_STORE)) {
        db.createObjectStore(TOKEN_STORE, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Open IndexedDB for offline queue
 */
export function openQueueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(QUEUE_DB, 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('retries', 'retries', { unique: false });
        store.createIndex('url', 'url', { unique: false });
      }
    };
  });
}

/**
 * Get stored token from IndexedDB
 */
export async function getStoredToken(): Promise<string | null> {
  try {
    const db = await openTokenDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TOKEN_STORE], 'readonly');
      const store = transaction.objectStore(TOKEN_STORE);
      const request = store.get('github-token');

      request.onsuccess = () => resolve(request.result?.token || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get token from storage:', error);
    return null;
  }
}

/**
 * Store token in IndexedDB
 */
export async function storeTokenInDB(token: string): Promise<void> {
  try {
    const db = await openTokenDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TOKEN_STORE], 'readwrite');
      const store = transaction.objectStore(TOKEN_STORE);
      const request = store.put({ id: 'github-token', token, timestamp: Date.now() });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to store token:', error);
    throw error;
  }
}

/**
 * Clear token from IndexedDB
 */
export async function clearStoredToken(): Promise<void> {
  try {
    const db = await openTokenDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([TOKEN_STORE], 'readwrite');
      const store = transaction.objectStore(TOKEN_STORE);
      const request = store.delete('github-token');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to clear token:', error);
  }
}

/**
 * Add request to offline queue
 */
export async function addToQueue(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: string | null = null
): Promise<string> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);

      const queueItem: QueuedRequest = {
        id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        url,
        method,
        headers,
        body,
        timestamp: Date.now(),
        retries: 0
      };

      const request = store.add(queueItem);

      request.onsuccess = () => {
        console.log('Request queued for offline sync:', queueItem);
        resolve(queueItem.id);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to add to queue:', error);
    throw error;
  }
}

/**
 * Get all queued requests
 */
export async function getAllQueuedRequests(): Promise<QueuedRequest[]> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE], 'readonly');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get queued requests:', error);
    return [];
  }
}

/**
 * Get queued requests by URL pattern
 */
export async function getQueuedRequestsByUrl(urlPattern: string): Promise<QueuedRequest[]> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE], 'readonly');
      const store = transaction.objectStore(QUEUE_STORE);
      const index = store.index('url');
      const range = IDBKeyRange.only(urlPattern);
      const request = index.getAll(range);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to get queued requests by URL:', error);
    return [];
  }
}

/**
 * Remove request from queue
 */
export async function removeFromQueue(id: string): Promise<void> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to remove from queue:', error);
  }
}

/**
 * Update retry count for queued request
 */
export async function updateQueueRetries(id: string, retries: number): Promise<void> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
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
  } catch (error) {
    console.error('Failed to update queue retries:', error);
  }
}

/**
 * Clear entire queue
 */
export async function clearQueue(): Promise<void> {
  try {
    const db = await openQueueDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([QUEUE_STORE], 'readwrite');
      const store = transaction.objectStore(QUEUE_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to clear queue:', error);
  }
}

/**
 * Send message to Service Worker
 */
export function postToServiceWorker(message: any): void {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return;
  }

  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  } else {
    console.warn('Service Worker not active yet');
  }
}

/**
 * Listen for Service Worker messages
 */
export function onServiceWorkerMessage(
  callback: (event: ExtendableMessageEvent) => void
): void {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Worker not supported');
    return;
  }

  navigator.serviceWorker.addEventListener('message', callback);
}
