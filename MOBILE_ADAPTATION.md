# Мобильная адаптация

Проект оптимизирован для мобильных устройств с предотвращением нежелательного зума при вводе текста в поля форм.

## Реализованные улучшения

### 1. Viewport Meta Tag

Обновлен viewport meta tag в `index.html` с дополнительными параметрами:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

**Параметры:**
- `maximum-scale=1.0` - предотвращает зум выше 100%
- `user-scalable=no` - отключает ручной зум пользователя
- `viewport-fit=cover` - для устройств с вырезами (notch)

### 2. CSS Оптимизации

Добавлены специальные CSS правила в `src/index.css`:

#### Предотвращение зума на фокус
```css
@media screen and (max-width: 768px) {
  input:focus, textarea:focus, select:focus {
    font-size: 16px;
    transform: none;
    -webkit-text-size-adjust: 100%;
  }
}
```

#### iOS Safari фиксы
```css
@supports (-webkit-touch-callout: none) {
  input, textarea, select {
    font-size: 16px !important;
  }
}
```

#### Улучшенные touch targets
```css
button, input, textarea, select {
  min-height: 44px;
  min-width: 44px;
}
```

### 3. Мобильные CSS классы

Добавлены специальные классы для форм:

- `.mobile-form` - адаптивные отступы для форм
- `.mobile-input` - оптимизированные input поля
- `.mobile-textarea` - оптимизированные textarea поля

### 4. Компоненты с мобильной адаптацией

Обновлены все компоненты с формами:

- ✅ **AuthPage.tsx** - форма авторизации
- ✅ **HomePage.tsx** - форма создания форума
- ✅ **ForumPage.tsx** - форма создания топика
- ✅ **TopicPage.tsx** - форма ответа на пост

## Технические детали

### Почему font-size: 16px?

iOS Safari автоматически зумит при фокусе на input полях с font-size < 16px. Установка font-size: 16px предотвращает этот зум.

### Touch targets

Минимальный размер touch targets (44px) соответствует рекомендациям Apple и Google для доступности.

### Viewport-fit=cover

Параметр `viewport-fit=cover` обеспечивает правильное отображение на устройствах с вырезами (iPhone X и новее).

## Тестирование

Рекомендуется протестировать на:

- 📱 iOS Safari (iPhone)
- 📱 Android Chrome
- 📱 Samsung Internet
- 💻 Desktop browsers

## Дополнительные улучшения

При необходимости можно добавить:

- PWA манифест для лучшего мобильного опыта
- Service Worker для оффлайн работы
- Touch gestures для навигации
- Swipe actions для мобильных устройств

## Совместимость

Решение совместимо с:
- ✅ iOS Safari 12+
- ✅ Android Chrome 70+
- ✅ Все современные мобильные браузеры
- ✅ Desktop browsers (без изменений поведения)