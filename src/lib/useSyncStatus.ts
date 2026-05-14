import { useEffect, useState, useCallback } from 'react';
import { swManager } from './serviceWorker';

interface SyncStatus {
  isSyncing: boolean;
  totalQueued: number;
  syncedCount: number;
  failedCount: number;
  lastSyncTime: number | null;
  error: string | null;
}

export function useSyncStatus() {
  const [status, setStatus] = useState<SyncStatus>({
    isSyncing: false,
    totalQueued: 0,
    syncedCount: 0,
    failedCount: 0,
    lastSyncTime: null,
    error: null
  });

  const updateQueueCount = useCallback(async () => {
    try {
      const queued = await swManager.getQueuedRequests();
      setStatus(prev => ({
        ...prev,
        totalQueued: queued.length
      }));
    } catch (error) {
      console.error('Failed to get queue count:', error);
    }
  }, []);

  useEffect(() => {
    // Initial load
    updateQueueCount();

    // Listen for sync complete events
    const unsubscribeSyncComplete = swManager.onSyncComplete((data) => {
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncedCount: data.successCount,
        failedCount: data.failedCount,
        totalQueued: data.totalCount - data.successCount,
        lastSyncTime: Date.now(),
        error: null
      }));
    });

    // Listen for request synced events
    const unsubscribeRequestSynced = swManager.onRequestSynced((data) => {
      console.log(`Request synced: ${data.method} ${data.url}`);
      updateQueueCount();
    });

    // Poll for queue updates every 5 seconds
    const interval = setInterval(updateQueueCount, 5000);

    return () => {
      unsubscribeSyncComplete();
      unsubscribeRequestSynced();
      clearInterval(interval);
    };
  }, [updateQueueCount]);

  const flushQueue = useCallback(async () => {
    setStatus(prev => ({
      ...prev,
      isSyncing: true,
      error: null
    }));
    try {
      await swManager.flushQueue();
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, []);

  return {
    ...status,
    updateQueueCount,
    flushQueue
  };
}
