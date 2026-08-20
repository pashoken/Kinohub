# KinoHub hardening report

Дата проверки: 2026-08-20. Область: локальный TV-first mock-стенд; домашний сервер не изменялся.

## UX и состояния

Весь пользовательский интерфейс русифицирован; служебные названия протоколов оставлены как имена продуктов. Unit/E2E покрывают loading, empty, upstream error, timeout, permission denial, expired/used opaque choice, no playable file, retry and offline-equivalent catalog failure. Финальная матрица фиксирует восемь поверхностей в 1280×720 и 1920×1080.

## Поиск и ввод

Пустой ввод не отправляется, запрос ограничен 120 символами на клиенте и сервере, Unicode/кириллица/спецсимволы кодируются. Sequence guard не позволяет медленному старому ответу заменить новые результаты, даже если транспорт игнорирует AbortSignal.

## Безопасность

Zod ограничивает внешние тела и search query; origin проверяется перед запросом загрузки; torrent/magnet остаётся в TTL-кэше сервера за opaque UUID; diagnostics возвращает только origin URL без credentials. `@fastify/static` обновлён до исправленной версии. Secret scan и production npm audit не имеют high/critical findings. Compose публикует порты только на loopback, контейнер работает UID 10001.

## Доступность и TV-ввод

Есть main/header/nav landmarks, связанные labels/headings, заметный focus-visible, modal trap/restore и Escape/Back. Стрелочная навигация учитывает геометрию; reduced-motion отключает плавное прокручивание и анимации. Axe WCAG A/AA проверяет home/detail/setup без serious/critical violations; keyboard-only E2E покрывает request и playback.

## Производительность и Docker

Production JS измеряется только по актуальным entry points и занимает около 67 KB gzip при бюджете 350 KB. Постеры ленивые и имеют responsive sizes; rails ограничены fixture catalog и не запускают unbounded requests. Runtime image содержит только compiled app artifacts и production dependencies; health и пятишаговый smoke проходят.

## Ограничения и откат

Mock mode демонстрационный: он не скачивает реальное медиа. Полный профиль требует ручной настройки аккаунтов, ключей, indexers и каталогов. Процедуры backup, configuration order, rollback boundary и последующей Ubuntu-миграции описаны в `local-docker.md` и `server-migration.md`.
