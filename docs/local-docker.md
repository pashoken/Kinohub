# Docker-запуск KinoHub

## Production-коробка с внешними сервисами

Требуется Docker Engine/Desktop с Compose v2 и настроенные Seerr, Jackett и TorrServer.

```bash
cp .env.example .env
# заполните .env
bash scripts/deploy.sh
```

Deploy-скрипт проверяет шаблон, собирает образ и ждёт healthy-состояния. Остановка: `docker compose down`; обновление: `git pull` и повторный запуск скрипта.

## Доступ из локальной сети

Скопируйте `.env.example` в `.env` и измените:

```dotenv
LAN_BIND=0.0.0.0
KINOHUB_PORT=4100
PUBLIC_APP_ORIGIN=http://192.168.1.50:4100
```

Подставьте постоянный IPv4/hostname машины с Docker и разрешите порт только для доверенной LAN в firewall. Административные панели остальных сервисов по умолчанию остаются на `127.0.0.1`.

## Полный медиастек

`compose.full.yaml` поднимает KinoHub, Seerr, Radarr, Sonarr, qBittorrent, Jackett, TorrServer и Jellyfin:

```bash
docker compose -f compose.full.yaml config
docker compose -f compose.full.yaml --profile full up -d
```

Сначала оставьте `APP_MODE=unconfigured`, настройте аккаунты, каталоги и связи через UI сервисов, затем перенесите URL/API-ключи в `.env`, выполните `npm run config:check` и переключите `APP_MODE=live`. Переменные описаны в [configuration.md](configuration.md).

| Сервис | Порт по умолчанию | Постоянные тома |
|---|---:|---|
| KinoHub | 4100 | нет |
| Seerr | 5055 | `seerr-config` |
| Radarr | 7878 | `radarr-config`, `media`, `downloads` |
| Sonarr | 8989 | `sonarr-config`, `media`, `downloads` |
| qBittorrent | 8080 | `qbittorrent-config`, `downloads` |
| Jackett | 9117 | `jackett-config`, `downloads` |
| TorrServer | 8090 | `torrserver-data` |
| Jellyfin | 8096 | `jellyfin-config`, `jellyfin-cache`, `media` |

`docker compose down` сохраняет тома. Не используйте `docker compose down -v`, если не собираетесь безвозвратно удалить конфигурацию и базы. Перед обновлением делайте резервную копию томов.

## Только Seerr

```bash
docker compose -f compose.seerr.yaml up -d
```

Seerr откроется на `http://127.0.0.1:5055`, а настройки сохранятся в именованном томе. Этот вариант удобен, если остальные сервисы уже работают отдельно.

Для Media Station X укажите `HOST:PORT` KinoHub (например, `192.168.1.50:4100`) в Settings → Start Parameter → Setup. MSX загрузит `/msx/start.json` автоматически.
