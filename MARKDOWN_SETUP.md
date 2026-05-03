# Установка зависимостей Markdown

После клонирования репозитория выполните:

```bash
npm install
```

Это установит все необходимые зависимости, включая:

- `react-markdown`: основной парсер Markdown
- `remark-gfm`: поддержка таблиц и зачеркнутого текста
- `rehype-highlight`: подсветка синтаксиса кода

## Ручная установка (если нужно)

```bash
npm install react-markdown@^9.0.1 remark-gfm@^4.0.0 rehype-highlight@^6.0.0
```

## Проверка установки

После установки проверьте, что зависимости добавлены в `package.json`:

```json
{
  "dependencies": {
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "rehype-highlight": "^6.0.0"
  }
}
```

## Запуск

```bash
npm run dev
```

Приложение запустится с полной поддержкой Markdown!