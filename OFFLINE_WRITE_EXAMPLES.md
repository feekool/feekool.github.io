# Примеры использования Offline Write Queue

## Пример 1: Создание поста с обработкой очереди

```typescript
import { useState } from 'react';
import { useSyncStatus } from '../lib/useSyncStatus';

export function CreatePostForm() {
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(null);
  
  const { totalQueued, flushQueue } = useSyncStatus();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      // Проверяем статус ответа
      if (response.status === 202) {
        // Запрос был поставлен в очередь
        const data = await response.json();
        setMessage({
          type: 'info',
          text: `Post queued for sync. Reason: ${data.reason}. It will be posted when token/network is available.`
        });
        setContent('');
      } else if (response.ok) {
        // Запрос успешно создан
        setMessage({
          type: 'success',
          text: 'Post created successfully!'
        });
        setContent('');
      } else {
        // Ошибка
        setMessage({
          type: 'error',
          text: 'Failed to create post'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your post..."
          className="w-full p-3 border rounded"
          rows={4}
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </form>

      {/* Сообщения */}
      {message && (
        <div className={`p-3 rounded border ${
          message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Информация об очереди */}
      {totalQueued > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
          <p>{totalQueued} post{totalQueued !== 1 ? 's' : ''} waiting to sync</p>
          <button
            onClick={flushQueue}
            className="mt-2 px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
          >
            Retry Now
          </button>
        </div>
      )}
    </div>
  );
}
```

## Пример 2: Компонент с отслеживанием синхронизации

```typescript
import { useEffect, useState } from 'react';
import { swManager } from '../lib/serviceWorker';

interface SyncEvent {
  type: 'synced' | 'failed' | 'complete';
  url?: string;
  method?: string;
  successCount?: number;
  failedCount?: number;
  reason?: string;
}

export function SyncStatusMonitor() {
  const [events, setEvents] = useState<SyncEvent[]>([]);

  useEffect(() => {
    // Слушать события синхронизации
    const unsubscribeSynced = swManager.onRequestSynced((data) => {
      setEvents(prev => [{
        type: 'synced',
        url: data.url,
        method: data.method
      }, ...prev.slice(0, 9)]);
    });

    const unsubscribeComplete = swManager.onSyncComplete((data) => {
      setEvents(prev => [{
        type: 'complete',
        successCount: data.successCount,
        failedCount: data.failedCount
      }, ...prev.slice(0, 9)]);
    });

    return () => {
      unsubscribeSynced();
      unsubscribeComplete();
    };
  }, []);

  if (events.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 bg-white rounded shadow-lg p-4 max-w-xs max-h-64 overflow-y-auto">
      <h3 className="font-bold mb-2">Recent Syncs</h3>
      <div className="space-y-1 text-sm">
        {events.map((event, idx) => (
          <div key={idx} className="text-gray-600">
            {event.type === 'synced' && (
              <span className="text-green-600">✓ {event.method} {event.url?.split('/').pop()}</span>
            )}
            {event.type === 'complete' && (
              <span className="text-blue-600">Complete: {event.successCount}✓ {event.failedCount}✗</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Пример 3: Обновление поста с обработкой очереди

```typescript
export async function updatePost(
  postId: string,
  content: string,
  onQueued?: () => void,
  onSuccess?: () => void,
  onError?: (error: string) => void
) {
  try {
    const response = await fetch(`/api/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });

    if (response.status === 202) {
      // Запрос в очереди
      const data = await response.json();
      console.log('Update queued:', data.reason);
      onQueued?.();
      return { queued: true };
    } else if (response.ok) {
      onSuccess?.();
      return { success: true };
    } else {
      const error = await response.text();
      onError?.(error);
      throw new Error(error);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    onError?.(message);
    throw error;
  }
}

// Использование в компоненте
export function PostEditor({ postId, initialContent }: { postId: string; initialContent: string }) {
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<'idle' | 'saving' | 'queued'>('idle');
  const { flushQueue } = useSyncStatus();

  const handleSave = async () => {
    setStatus('saving');
    try {
      const result = await updatePost(
        postId,
        content,
        () => setStatus('queued'),
        () => setStatus('idle'),
        (error) => {
          console.error(error);
          setStatus('idle');
        }
      );
    } catch (error) {
      setStatus('idle');
    }
  };

  return (
    <div className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full p-2 border rounded"
      />
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={status === 'saving'}
          className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving...' : 'Save'}
        </button>
        {status === 'queued' && (
          <div className="flex items-center gap-2 text-orange-600">
            <span>In queue</span>
            <button
              onClick={flushQueue}
              className="px-2 py-1 text-sm bg-orange-100 rounded hover:bg-orange-200"
            >
              Retry
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

## Пример 4: Проверка очереди перед выходом

```typescript
export function useConfirmQueuedRequests() {
  const { totalQueued } = useSyncStatus();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (totalQueued > 0) {
        e.preventDefault();
        e.returnValue = `You have ${totalQueued} unsynchronized request(s). Are you sure you want to leave?`;
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [totalQueued]);

  return { totalQueued };
}

// Использование
export function App() {
  const { totalQueued } = useConfirmQueuedRequests();
  
  return <div>{/* ... */}</div>;
}
```

## Пример 5: Кастомные фильтры синхронизации

```typescript
export async function getFailedRequests() {
  const all = await swManager.getQueuedRequests();
  return all.filter(req => req.retries > 0);
}

export async function getRecentQueuedRequests(minutes: number = 5) {
  const all = await swManager.getQueuedRequests();
  const threshold = Date.now() - (minutes * 60 * 1000);
  return all.filter(req => req.timestamp > threshold);
}

export async function getQueuedRequestsByUrl(pattern: string) {
  const all = await swManager.getQueuedRequests();
  const regex = new RegExp(pattern);
  return all.filter(req => regex.test(req.url));
}

// Использование
function QueueAnalytics() {
  const [stats, setStats] = useState({
    total: 0,
    failed: 0,
    recent: 0
  });

  useEffect(() => {
    const loadStats = async () => {
      const all = await swManager.getQueuedRequests();
      const failed = await getFailedRequests();
      const recent = await getRecentQueuedRequests(5);
      
      setStats({
        total: all.length,
        failed: failed.length,
        recent: recent.length
      });
    };

    loadStats();
    const interval = setInterval(loadStats, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="p-4 bg-blue-50 rounded">
        <div className="text-2xl font-bold">{stats.total}</div>
        <div className="text-sm text-gray-600">Total queued</div>
      </div>
      <div className="p-4 bg-red-50 rounded">
        <div className="text-2xl font-bold">{stats.failed}</div>
        <div className="text-sm text-gray-600">Failed attempts</div>
      </div>
      <div className="p-4 bg-yellow-50 rounded">
        <div className="text-2xl font-bold">{stats.recent}</div>
        <div className="text-sm text-gray-600">Recent 5 min</div>
      </div>
    </div>
  );
}
```

## Пример 6: Отслеживание в админ панели

```typescript
export function AdminQueueMonitor() {
  const [queue, setQueue] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = async () => {
    setIsRefreshing(true);
    try {
      const requests = await swManager.getQueuedRequests();
      setQueue(requests);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Offline Queue Monitor</h2>
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className="px-3 py-1 bg-blue-500 text-white rounded disabled:opacity-50"
        >
          Refresh
        </button>
      </div>

      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left">URL</th>
            <th className="p-2 text-left">Method</th>
            <th className="p-2">Retries</th>
            <th className="p-2">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {queue.map(req => (
            <tr key={req.id} className="border-t hover:bg-gray-50">
              <td className="p-2 text-sm truncate">{req.url.split('/').slice(-2).join('/')}</td>
              <td className="p-2"><span className="px-2 py-1 bg-gray-200 rounded text-sm">{req.method}</span></td>
              <td className="p-2 text-center">{req.retries}</td>
              <td className="p-2 text-sm text-gray-500">{new Date(req.timestamp).toLocaleTimeString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {queue.length === 0 && (
        <div className="p-4 text-center text-gray-500">No queued requests</div>
      )}
    </div>
  );
}
```
