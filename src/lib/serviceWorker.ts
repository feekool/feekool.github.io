// Service Worker Manager
// Handles registration and secure token storage in IndexedDB

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;

  async register(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('Service Worker registered successfully');

      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;

      // Set up message handling
      navigator.serviceWorker.addEventListener('message', this.handleMessage.bind(this));

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  async setToken(token: string): Promise<void> {
    if (!this.registration?.active) {
      console.warn('Service worker not active, cannot send token');
      return;
    }

    try {
      // Send token to service worker for storage in IndexedDB
      this.registration.active.postMessage({
        type: 'SET_TOKEN',
        token: token
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

  private handleMessage(event: MessageEvent): void {
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