# Offline Write Queue (Outbox Pattern)

## Обзор

Реализован стандартный PWA паттерн для offline-write сценариев - **Outbox** (очередь). Эта архитектура позволяет приложению сохранять POST/PUT/PATCH/DELETE запросы в IndexedDB когда:

1. **Отсутствует токен аутентификации** (401 Unauthorized)
2. **Отсутствует интернет соединение** (offline mode)
3. **Восстановление сети** - автоматическая повторная отправка

## Архитектура

### Компоненты системы

#### 1. **Shared Module** (`src/lib/queueManagement.ts`)
Общий модуль для работы с IndexedDB, доступен как для фронтенда, так и для Service Worker:

- `openTokenDB()` / `openQueueDB()` - открытие БД
- `getStoredToken()` / `storeTokenInDB()` - работа с токеном
- `addToQueue()` / `removeFromQueue()` - управление очередью
- `getAllQueuedRequests()` - получение всех ожидающих запросов

#### 2. **Service Worker** (`public/sw.js`)

**Обработка write-запросов:**
- При отсутствии токена → ставит в очередь (202 Accepted)
- При получении 401 → ставит в очередь для повторной отправки
- При offline → ставит в очередь с уведомлением

**Синхронизация очереди:**
- `syncOfflineRequests()` - повторно отправляет все ожидающие запросы
- Вызывается автоматически:
  - При восстановлении сети (onLine event)
  - После получения нового токена (SET_TOKEN message)
  - При ручном вызове (FLUSH_QUEUE message)

**Message API:**
```javascript
// От фронтенда к SW
{
  type: 'SET_TOKEN',          // Отправить новый токен и попробовать sync
  token: 'github_pat_...'
}

{
  type: 'FLUSH_QUEUE'         // Принудительно попытаться sync
}

{
  type: 'GET_QUEUED_REQUESTS' // Получить список ожидающих запросов
}

// От SW к фронтенду
{
  type: 'SYNC_COMPLETE',
  successCount: 5,
  failedCount: 1,
  totalCount: 6
}

{
  type: 'REQUEST_SYNCED',
  url: 'https://api.github.com/repos/...',
  method: 'POST',
  status: 201
}

{
  type: 'REQUEST_SYNC_FAILED',
  url: '...',
  method: 'POST',
  reason: 'auth-failed' | 'max-retries' | 'network-error'
}
```

#### 3. **Service Worker Manager** (`src/lib/serviceWorker.ts`)

Прокси для общения с Service Worker:

```typescript
swManager.setToken(token)           // Установить токен и попытаться sync
swManager.flushQueue()              // Принудительный sync
swManager.getQueuedRequests()       // Получить очередь
swManager.onSyncComplete(callback)  // Слушать события sync
swManager.onRequestSynced(callback) // Слушать события синхронизации
```

#### 4. **Frontend Hook** (`src/lib/useSyncStatus.ts`)

React hook для отслеживания статуса очереди в UI:

```typescript
const {
  totalQueued,      // Количество ожидающих запросов
  isSyncing,        // Идет ли синхронизация
  syncedCount,      // Сколько успешно синхронизировано
  failedCount,      // Сколько ошибок
  flushQueue,       // Функция для ручного sync
  error             // Текст ошибки если есть
} = useSyncStatus();
```

#### 5. **UI Component** (`src/components/SyncQueueIndicator.tsx`)

Визуальный индикатор статуса очереди:
- Показывает количество ожидающих запросов
- Отображает прогресс синхронизации
- Кнопка для ручной синхронизации
- Уведомления об ошибках

## Поток данных

### Сценарий 1: Пользователь без токена создает пост

```
1. Фронтенд отправляет POST запрос в SW
2. SW проверяет токен → токена нет
3. SW ставит запрос в IndexedDB (offline queue)
4. SW возвращает 202 Accepted с queueing уведомлением
5. Фронтенд показывает SyncQueueIndicator (N запросов в очереди)
6. Пользователь логинится
7. Фронтенд отправляет токен в SW: postMessage({ type: 'SET_TOKEN', token })
8. SW сохраняет токен в IndexedDB
9. SW автоматически вызывает syncOfflineRequests()
10. Все запросы из очереди повторно отправляются с новым токеном
11. Фронтенд получает EVENT 'REQUEST_SYNCED' → обновляет UI
```

### Сценарий 2: Пользователь offline создает пост

```
1. Фронтенд отправляет POST запрос в SW
2. SW пытается fetch → получает 'Failed to fetch'
3. SW ставит запрос в IndexedDB
4. SW возвращает 202 Accepted с offline уведомлением
5. Когда пользователь снова online:
   - Браузер генерирует 'online' event
   - SW слушает это событие
   - SW вызывает syncOfflineRequests()
   - Все запросы повторно отправляются
```

### Сценарий 3: Пользователь имеет токен

```
1. Фронтенд отправляет запрос
2. SW добавляет Authorization header с токеном
3. Если 201/204 OK → кеширует и возвращает
4. Если 401 → ставит обратно в очередь (может потребоваться рефреш токена)
5. Если offline → ставит в очередь
```

## Механизм повтора

- **Максимум 3 попытки** на запрос
- **После каждой неудачной попытки** retry count увеличивается
- **При достижении лимита** запрос удаляется из очереди с уведомлением об ошибке
- **При 401** - не увеличивает retry count, ждет нового токена

## Индексирование в IndexedDB

```typescript
// offline-queue-store
{
  id: "1234567890_abc123",  // keyPath
  url: "https://api.github.com/repos/...",
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{ ... }",
  timestamp: 1234567890,    // индекс для сортировки
  retries: 0                // индекс для фильтрации неудачных
}
```

## Использование в коде

### На фронтенде после логина

Уже реализовано в `src/lib/auth.ts`:
```typescript
// После успешного логина
if (config.github.token && navigator.serviceWorker?.controller) {
  navigator.serviceWorker.controller.postMessage({
    type: 'SET_TOKEN',
    token: config.github.token
  });
}
```

### В компонентах

```typescript
import { SyncQueueIndicator } from './components/SyncQueueIndicator';
import { useSyncStatus } from './lib/useSyncStatus';

// В Layout - автоматически показывает индикатор
<SyncQueueIndicator />

// В кастомных компонентах
export function MyComponent() {
  const { totalQueued, flushQueue } = useSyncStatus();
  
  return (
    <div>
      {totalQueued > 0 && (
        <button onClick={flushQueue}>
          Sync {totalQueued} requests
        </button>
      )}
    </div>
  );
}
```

## Логирование и отладка

Все операции логируются в браузерной консоли:

```
// SET_TOKEN
Token sent to service worker for secure storage
Token stored securely in service worker
Token stored, attempting to flush queue

// SYNC
Syncing offline requests...
Found 3 pending requests to sync
Synced request: https://api.github.com/repos/...
Sync complete: 3 succeeded, 0 failed
```

Для отладки в консоли:
```javascript
// Получить очередь
await swManager.getQueuedRequests()

// Принудительный sync
await swManager.flushQueue()

// Количество запросов
(await swManager.getQueuedRequests()).length
```

## Отличия от предыдущей реализации

| Фича | До | После |
|------|-----|-------|
| Обработка 401 | Возвращал 401 ошибку | Ставит в очередь, повторно отправляет при токене |
| Flush механизм | Нет явного триггера | Автоматический после SET_TOKEN + ручной FLUSH_QUEUE |
| UI индикатор | Нет | SyncQueueIndicator показывает статус |
| Обработка токена | Только на старте | На старте + после логина + в каждом sync |
| Message события | Базовые | Расширенные: SYNC_COMPLETE, REQUEST_SYNCED, REQUEST_SYNC_FAILED |

## Будущие улучшения

1. **Persistence настроек**: Сохранять предпочтения пользователя о retry интервалах
2. **Grouping запросов**: Объединять похожие запросы перед повторной отправкой
3. **Prioritization**: Приоритизировать критичные запросы при ручном sync
4. **Analytics**: Отслеживать статистику успешности sync операций
5. **Partial uploads**: Для больших файлов - поддержка partial uploads
