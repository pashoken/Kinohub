# KinoHub TV

The optional ultra-thin Android TV wrapper and sideload instructions are documented in
[`docs/android-tv.md`](docs/android-tv.md).

KinoHub — локальный TV-first каталог для домашней сети. В режиме `mock` он работает без сторонних сервисов и секретов.

## Нативный запуск

1. Установите Node.js 24+ и выполните `npm install`.
2. Скопируйте `.env.example` в `.env` при необходимости. Переменные процесса имеют приоритет над файлом `.env`; значения по умолчанию безопасны для mock-режима.
3. Запустите `npm run dev`.
4. Откройте `http://127.0.0.1:5173`; API доступен на `http://127.0.0.1:4100/api/health`.

Проверки: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`.

Никакие ключи не должны попадать в `VITE_*`: интеграции выполняются только сервером.
