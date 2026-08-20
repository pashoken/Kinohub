# Локальный Docker-запуск KinoHub

## Быстрый mock-стенд

Требования: Docker Desktop с Compose v2. Секреты и сторонние аккаунты не нужны.

```powershell
docker compose config
docker compose up -d --build
docker compose ps
npm run smoke:docker
```

Откройте `http://127.0.0.1:4100`; диагностика — `http://127.0.0.1:4100/setup`. Остановка: `docker compose down`. Порт меняется через `KINOHUB_PORT`, например `$env:KINOHUB_PORT=4110`.

## Полная лаборатория (только по явному запросу)

```powershell
docker compose -f compose.full.yaml config
docker compose -f compose.full.yaml --profile full up -d
```

| Сервис | Порт хоста | Постоянные данные |
|---|---:|---|
| KinoHub | 4100 | нет |
| Seerr | 5055 | `seerr-config` |
| Radarr | 7878 | `radarr-config`, `media`, `downloads` |
| Sonarr | 8989 | `sonarr-config`, `media`, `downloads` |
| qBittorrent | 8080 | `qbittorrent-config`, `downloads` |
| Jackett | 9117 | `jackett-config`, `downloads` |
| TorrServer | 8090 | `torrserver-data` |
| Jellyfin | 8096 | `jellyfin-config`, `jellyfin-cache`, `media` |

Все опубликованные порты привязаны к `127.0.0.1`. Сначала задайте пароли в UI qBittorrent/TorrServer, затем индексаторы Jackett, загрузчик и корневые каталоги Radarr/Sonarr, Jellyfin, Seerr и лишь после этого переключайте KinoHub из `unconfigured` в `live`. API-ключи храните только в локальном `.env`, который исключён из образа.

Перед удалением томов сделайте резервную копию: `docker run --rm -v kinohub-full_seerr-config:/data -v ${PWD}:/backup alpine tar czf /backup/seerr-config.tgz -C /data .`. Повторите для каждого тома из таблицы. `docker compose down` сохраняет данные; `docker compose down -v` необратимо удаляет их и не используется в штатном откате.

## Только Seerr рядом с внешним TorrServer

На Windows используйте именованный Docker-том для SQLite Seerr:

```powershell
docker compose -f compose.seerr.yaml up -d
```

Seerr откроется на `http://127.0.0.1:5055` как часть общего проекта `kinohub-local`; его существующие настройки сохраняются во внешнем томе `kinohub-seerr_seerr-data`. Контейнерный TorrServer доступен на `http://127.0.0.1:8091`, а внутри сети compose — как `http://torrserver:8090`. Порт `8091` выбран, чтобы локальный экземпляр TorrServer на Windows мог временно продолжать работать на `8090`. Seerr напрямую с TorrServer не интегрируется: Seerr отвечает за каталог и запросы, а KinoHub вызывает TorrServer отдельно.

Для просмотра с телевизора или проектора задайте `LAN_HOST` равным IPv4-адресу компьютера. KinoHub и TorrServer публикуются в локальную сеть, а административные интерфейсы Seerr и Jackett остаются привязаны к `127.0.0.1`.

Для Media Station X откройте Settings → Start Parameter → Setup и введите только `LAN_HOST:KINOHUB_PORT` (например, `192.168.0.120:4100`). MSX автоматически загрузит `/msx/start.json`, покажет плитку KinoHub и откроет приложение через действие `link:`.

Ссылки загрузки Jackett, передаваемые в контейнер TorrServer, должны использовать внутренний адрес `http://jackett:9117`; `localhost:9117` внутри TorrServer указывает не на Jackett.
