// Service Worker Manager
// Handles registration and secure token storage in IndexedDB

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private pendingToken: string | null = null;
  private pendingCacheClear = false;

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

  private handleMessage(event: MessageEvent): void {
    if (event.data?.type === 'CACHE_CLEARED') {
      console.log('Service worker cache cleared');
      return;
    }
    // Handle messages from service worker if needed
    if (event.data?.type === 'TOKEN_STORED') {
      console.log('Token successfully stored in service worker');
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
