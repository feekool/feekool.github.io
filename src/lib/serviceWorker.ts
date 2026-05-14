// Service Worker Manager
// Handles registration and secure token storage in IndexedDB

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
  retries: number;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private pendingToken: string | null = null;
  private pendingCacheClear = false;
  private messageCallbacks: Map<string, (data: any) => void> = new Map();

  async register(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const swUrl = new URL('sw.js', window.location.origin + baseUrl).href;
      this.registration = await navigator.serviceWorker.register(swUrl, {
        scope: baseUrl
      });

      console.log('Service Worker registered successfully at', swUrl, 'scope', baseUrl);

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      // Re-read registration because it may have changed during activation
      this.registration = await navigator.serviceWorker.getRegistration('/') || this.registration;

      // Send any queued token once the worker is active
      if (this.pendingToken && this.registration?.active) {
        this.sendTokenToWorker(this.pendingToken);
        this.pendingToken = null;
      }

      // Send any queued cache clear request once the worker is active
      if (this.pendingCacheClear && this.registration?.active) {
        this.sendCacheClear();
        this.pendingCacheClear = false;
      }

      // Set up message handling
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));

      // Expose manual cache clear command in console
      window.clearGitHubApiCache = async () => {
        await this.clearCache();
      };

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  async setToken(token: string): Promise<void> {
    if (this.registration?.active) {
      this.sendTokenToWorker(token);
      return;
    }

    this.pendingToken = token;
    console.log('Service worker not active yet; token queued for delivery after registration');
  }

  private sendTokenToWorker(token: string): void {
    if (!this.registration?.active) {
      console.warn('Service worker not active, cannot send token');
      return;
    }

    try {
      this.registration.active.postMessage({
        type: 'SET_TOKEN',
        token
      });

      console.log('Token sent to service worker for secure storage');
    } catch (error) {
      console.error('Failed to send token to service worker:', error);
    }
  }

  async clearToken(): Promise<void> {
    if (!this.registration?.active) {
      return;
    }

    try {
      this.registration.active.postMessage({
        type: 'CLEAR_TOKEN'
      });
    } catch (error) {
      console.error('Failed to clear token from service worker:', error);
    }
  }

  async clearCache(): Promise<void> {
    if (!this.registration?.active) {
      this.pendingCacheClear = true;
      return;
    }

    this.sendCacheClear();
  }

  private sendCacheClear(): void {
    if (!this.registration?.active) {
      console.warn('Service worker not active, cannot clear cache');
      return;
    }

    try {
      this.registration.active.postMessage({
        type: 'CLEAR_CACHE'
      });
    } catch (error) {
      console.error('Failed to send cache clear command to service worker:', error);
    }
  }

  /**
   * Flush offline queue - attempt to sync all queued requests
   */
  async flushQueue(): Promise<void> {
    if (!this.registration?.active) {
      console.warn('Service worker not active, cannot flush queue');
      return;
    }

    try {
      this.registration.active.postMessage({
        type: 'FLUSH_QUEUE'
      });
      console.log('Flush queue command sent to service worker');
    } catch (error) {
      console.error('Failed to flush queue:', error);
    }
  }

  /**
   * Get queued requests from service worker
   */
  async getQueuedRequests(): Promise<QueuedRequest[]> {
    if (!this.registration?.active) {
      console.warn('Service worker not active, cannot get queued requests');
      return [];
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.messageCallbacks.delete('QUEUED_REQUESTS');
        resolve([]);
      }, 5000); // 5 second timeout

      this.messageCallbacks.set('QUEUED_REQUESTS', (data: any) => {
        clearTimeout(timeout);
        this.messageCallbacks.delete('QUEUED_REQUESTS');
        resolve(data.requests || []);
      });

      try {
        this.registration.active.postMessage({
          type: 'GET_QUEUED_REQUESTS'
        });
      } catch (error) {
        console.error('Failed to get queued requests:', error);
        clearTimeout(timeout);
        this.messageCallbacks.delete('QUEUED_REQUESTS');
        resolve([]);
      }
    });
  }

  /**
   * Register callback for sync events
   */
  onSyncComplete(callback: (data: any) => void): () => void {
    const listener = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        callback(event.data);
      }
    };

    navigator.serviceWorker.addEventListener('message', listener);

    // Return unsubscribe function
    return () => {
      navigator.serviceWorker.removeEventListener('message', listener);
    };
  }

  /**
   * Register callback for request sync events
   */
  onRequestSynced(callback: (data: any) => void): () => void {
    const listener = (event: MessageEvent) => {
      if (event.data?.type === 'REQUEST_SYNCED') {
        callback(event.data);
      }
    };

    navigator.serviceWorker.addEventListener('message', listener);

    // Return unsubscribe function
    return () => {
      navigator.serviceWorker.removeEventListener('message', listener);
    };
  }

  private handleMessage(event: MessageEvent): void {
    const { data } = event;

    if (!data || !data.type) return;

    // Handle callbacks
    if (this.messageCallbacks.has(data.type)) {
      const callback = this.messageCallbacks.get(data.type);
      if (callback) {
        callback(data);
      }
    }

    // Handle specific message types
    if (data.type === 'CACHE_CLEARED') {
      console.log('Service worker cache cleared');
    } else if (data.type === 'TOKEN_STORED') {
      console.log('Token successfully stored in service worker');
    } else if (data.type === 'TOKEN_CLEARED') {
      console.log('Token cleared from service worker');
    } else if (data.type === 'SYNC_COMPLETE') {
      console.log(`Sync complete: ${data.successCount} succeeded, ${data.failedCount} failed`);
    } else if (data.type === 'REQUEST_SYNCED') {
      console.log(`Request synced: ${data.method} ${data.url}`);
    } else if (data.type === 'REQUEST_SYNC_FAILED') {
      console.warn(`Request sync failed: ${data.method} ${data.url} - ${data.reason}`);
    }
  }

  async unregister(): Promise<void> {
    if (this.registration) {
      await this.registration.unregister();
      this.registration = null;
      console.log('Service Worker unregistered');
    }
  }

  get isRegistered(): boolean {
    return this.registration !== null;
  }
}

// Export singleton instance
export const swManager = new ServiceWorkerManager();

// Export cache clearing function
export const clearGitHubApiCache = async (): Promise<void> => {
  await swManager.clearCache();
};
