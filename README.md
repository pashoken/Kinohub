# KinoHub TV

Готовая self-hosted «коробка» для TV-first каталога фильмов и сериалов. Production-вариант подключается к Seerr, Jackett и TorrServer; браузер, Android TV и Media Station X открывают один адрес KinoHub.

## Развернуть на сервере

Требования: Linux/Windows-сервер с Docker Engine/Desktop и Docker Compose v2.

```bash
git clone https://github.com/pashoken/Kinohub.git kinohub
cd kinohub
cp .env.example .env
nano .env
bash scripts/deploy.sh
```

В `.env` нужно заменить значения `CHANGE_ME`: публичный IP/hostname сервера, URL и API key Seerr, URL и API key Jackett, внутренний и публичный URL TorrServer. Скрипт остановится, если шаблон заполнен не полностью, соберёт образ, дождётся healthcheck и покажет состояние контейнера.

PowerShell-вариант:

```powershell
Copy-Item .env.example .env
notepad .env
.\scripts\deploy.ps1
```

После запуска откройте адрес из `PUBLIC_APP_ORIGIN`. Все креды находятся только в локальном `.env`, который исключён из Git и Docker-образа. Подробная таблица настроек и получение ключей: [docs/configuration.md](docs/configuration.md).

## Что входит

- Production Docker-образ с web-интерфейсом и Fastify API.
- Проверка полноты live-конфигурации до запуска сервера.
- Интеграции Seerr, Jackett, TorrServer и необязательные провайдеры рейтингов.
- Android TV WebView-оболочка и endpoint для Media Station X.
- `restart: unless-stopped`, healthcheck и безопасная серверная обработка ключей.
- Дополнительный полный Compose-стек с Seerr/Radarr/Sonarr/qBittorrent/Jackett/TorrServer/Jellyfin.

## Если внешних сервисов ещё нет

Используйте [compose.full.yaml](compose.full.yaml) по инструкции [docs/local-docker.md](docs/local-docker.md). У таких сервисов есть собственная первоначальная настройка через UI: Docker не может заранее сгенерировать их API-ключи. После настройки внесите два ключа и адреса в `.env`, переключите `APP_MODE=live` и повторно запустите deploy-скрипт.

## Локальная разработка

Требования: Node.js 22.12+ и npm 10+.

```bash
npm ci
npm run dev
```

Без `.env` используется автономный mock-режим: UI — `http://127.0.0.1:5173`, API — `http://127.0.0.1:4100/api/health`.

## Структура и проверки

```text
apps/server        API, конфигурация, интеграции
apps/web           React/Vite интерфейс
apps/android       Android TV оболочка
packages/contracts общие схемы и типы
fixtures           mock-данные
docs               deployment и эксплуатация
```

```bash
npm run config:check
npm run build
npm run typecheck
npm run lint
npm test
npm run check:secrets
```
