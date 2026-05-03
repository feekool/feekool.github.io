# Исправление ошибки "cant find variable topic page"

## Проблема

При открытии вложенных страниц (topic страниц) возникала JavaScript ошибка:
```
cant find variable topic page
```

## Причина

В файле `src/App.tsx` отсутствовал импорт компонента `TopicPage`:

```typescript
// Было (неправильно)
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { ForumPage } from './pages/ForumPage';
import { ProfilePage } from './pages/ProfilePage';

// Отсутствовал импорт TopicPage
```

Но в маршрутах компонент использовался:
```typescript
<Route path="/topic/:id" element={<TopicPage />} />
```

## Решение

Добавлен отсутствующий импорт `TopicPage` в `src/App.tsx`:

```typescript
// Стало (правильно)
import { AuthPage } from './pages/AuthPage';
import { HomePage } from './pages/HomePage';
import { ForumPage } from './pages/ForumPage';
import { TopicPage } from './pages/TopicPage';
import { ProfilePage } from './pages/ProfilePage';
```

## Проверка

- ✅ Импорт `TopicPage` добавлен
- ✅ Маршрут `/topic/:id` работает правильно
- ✅ Компонент `TopicPage` экспортируется корректно
- ✅ Все зависимости импортированы правильно

## Профилактика

При добавлении новых страниц всегда проверять:
1. Правильный экспорт компонента в файле страницы
2. Импорт компонента в `App.tsx`
3. Настройка маршрута в `AppRoutes`
4. Правильность всех зависимостей

## Статус

✅ **Исправлено** - ошибка больше не возникает при открытии topic страниц.