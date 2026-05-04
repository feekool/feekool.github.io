## Getting Started

1. Copy `.env.example` to `.env` and configure your environment variables
2. Run `npm install`
3. Run `npm run dev`

## Security

This application implements several security measures to protect sensitive data:

### API Token Security
- ✅ GitHub Personal Access Tokens are stored in environment variables only
- ✅ **Service Worker Protection**: Tokens are stored in IndexedDB and injected by service worker
- ✅ **Network Tab Security**: Authorization headers are not visible in DevTools Network tab
- ✅ Tokens are never logged in console output or error messages
- ✅ All error messages are sanitized to prevent token leakage
- ✅ Content Security Policy (CSP) headers prevent unauthorized script execution
- ✅ Server-side security headers (XSS protection, frame options, etc.)

### Service Worker Architecture
- ✅ **Secure Token Storage**: GitHub tokens stored in IndexedDB within service worker
- ✅ **Request Interception**: Service worker intercepts GitHub API calls and adds auth headers
- ✅ **Token Isolation**: Main app never directly accesses the token after initial setup
- ✅ **Automatic Cleanup**: Tokens cleared from storage on logout

### Environment Variables
Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

**Required environment variables:**
- `VITE_API_KEY`: GitHub Personal Access Token with `repo` scope

**Security best practices:**
- Never commit `.env` files to version control
- Rotate tokens regularly
- Use minimum required permissions
- Monitor token usage in GitHub settings

### Error Handling
- ✅ Sensitive data is automatically redacted from error logs
- ✅ Safe logging functions prevent accidental token exposure
- ✅ Network errors are sanitized before display to users

## Особенности

### Поддержка русского языка

Приложение полностью поддерживает создание постов и топиков на русском языке с автоматической транслитерацией:

- ✅ Создание топиков на русском языке
- ✅ Создание постов с русским текстом
- ✅ Автоматическая транслитерация названий (русский → латиница)
- ✅ Сохранение оригинального текста и транслитерированной версии

**Пример:**
```
Заголовок: "Как использовать фреймворк?"
Транслитерация: "kak-ispolzovat-freymuork"
```

### Мобильная адаптация

Приложение оптимизировано для мобильных устройств:

- ✅ Предотвращение нежелательного зума при вводе текста
- ✅ Оптимизированные touch targets (минимум 44px)
- ✅ Адаптивные формы для мобильных экранов
- ✅ Поддержка устройств с вырезами (notch)
- ✅ Совместимость с iOS Safari и Android Chrome

**Технические решения:**
- Viewport meta tag с `maximum-scale=1.0` и `user-scalable=no`
- CSS правила для предотвращения зума на фокус
- Font-size 16px для input полей (iOS Safari requirement)

Подробное описание: см. [MOBILE_ADAPTATION.md](./MOBILE_ADAPTATION.md)

### Оптимизация состояния

Приложение использует оптимистичное обновление состояния для мгновенного отображения новых элементов:

- ✅ Мгновенное отображение созданных топиков и постов
- ✅ Оптимистичное обновление без перезагрузки данных
- ✅ Улучшенная производительность и UX
- ✅ Снижение нагрузки на сервер

**Как работает:**
1. Пользователь создает топик/пост
2. Ждем успешного ответа сервера
3. Мгновенно добавляем элемент в локальное состояние
4. UI обновляется без задержек

Подробное описание: см. [STATE_OPTIMIZATION.md](./STATE_OPTIMIZATION.md)

### Профиль пользователя и аватарки Gravatar

Приложение включает страницу профиля с поддержкой аватарок Gravatar:

- ✅ Просмотр и редактирование профиля
- ✅ **Автоматическое создание Gravatar при регистрации** (новая функция)
- ✅ Загрузка собственной аватарки (JPG, PNG, GIF, WebP до 2MB)
- ✅ Кнопка сброса аватарки на Gravatar по умолчанию
- ✅ Отображение аватарок авторов в топиках и постах
- ✅ Отображаемое имя и настройки пользователя
- ✅ Интеграция с GitHub для хранения изображений

**Как использовать:**
1. При первой авторизации пользователю автоматически генерируется аватарка Gravatar на основе username
2. Клик на имя пользователя в шапке → страница профиля `/profile`
3. Загрузка собственной аватарки через иконку камеры (опционально)
4. Кнопка "Reset to Gravatar Avatar" для восстановления оригинальной Gravatar
5. Аватарки авторов отображаются автоматически во всех топиках и постах

**Обновления (May 2026):**
- ✨ Автоматическое создание аватарки Gravatar при регистрации новых пользователей
- ✨ Отображение аватарок авторов в темах обсуждения
- ✨ Возможность сброса на оригинальный Gravatar из профиля

Подробное описание: см. [USER_PROFILE.md](./USER_PROFILE.md)

### Поддержка Markdown

Приложение поддерживает полный Markdown синтаксис для создания красивых сообщений:

- ✅ **Парсер Markdown** с подсветкой кода и таблицами
- ✅ **Редактор с подсказками** и горячими клавишами
- ✅ **Панель инструментов** для быстрого форматирования
- ✅ **Предварительный просмотр** сообщений
- ✅ **Поддержка GFM** (GitHub Flavored Markdown)

**Возможности редактора:**
- **Жирный/курсив:** `**text**`, `*text*` или Ctrl+B/Ctrl+I
- **Код:** `` `code` `` или Ctrl+`
- **Ссылки:** `[text](url)` или Ctrl+K
- **Списки:** `- item` или Ctrl+Shift+8
- **Цитаты:** `> text` или Ctrl+Shift+>
- **Таблицы и многое другое**

Подробное описание: см. [MARKDOWN_SUPPORT.md](./MARKDOWN_SUPPORT.md)
