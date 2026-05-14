import React from 'react';
import { useSyncStatus } from '../lib/useSyncStatus';

export const SyncQueueIndicator: React.FC = () => {
  const { totalQueued, isSyncing, syncedCount, failedCount, flushQueue, error } = useSyncStatus();

  // Don't show if there's nothing queued
  if (totalQueued === 0 && syncedCount === 0 && failedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 max-w-sm">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
            Sync Queue
          </h3>
          {isSyncing && (
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Syncing...</span>
            </div>
          )}
        </div>

        {/* Queue status */}
        {totalQueued > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">
                {totalQueued} request{totalQueued !== 1 ? 's' : ''} queued
              </span>
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-100 text-xs rounded">
                Offline write
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              These requests will be sent when your token is available or connection is restored.
            </p>
          </div>
        )}

        {/* Synced/Failed status */}
        {(syncedCount > 0 || failedCount > 0) && (
          <div className="flex gap-3 text-sm">
            {syncedCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-green-600 dark:text-green-400">✓</span>
                <span className="text-gray-600 dark:text-gray-400">{syncedCount} synced</span>
              </div>
            )}
            {failedCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-red-600 dark:text-red-400">✗</span>
                <span className="text-gray-600 dark:text-gray-400">{failedCount} failed</span>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs p-2 rounded">
            {error}
          </div>
        )}

        {/* Sync button */}
        {totalQueued > 0 && (
          <button
            onClick={flushQueue}
            disabled={isSyncing}
            className="w-full px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white text-sm rounded transition-colors"
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </button>
        )}
      </div>
    </div>
  );
};
