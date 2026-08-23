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

## Полный потоковый стек

`compose.full.yaml` поднимает KinoHub, Seerr, Jackett, TorrServer и Jellyfin. Файлы фильмов на сервер не скачиваются. Jellyfin нужен только для настройки и авторизации Seerr.

```bash
docker compose -f compose.full.yaml config
docker compose -f compose.full.yaml --profile full up -d
```

Сначала оставьте `APP_MODE=unconfigured`. Создайте администратора Jellyfin, затем выберите Jellyfin в первоначальной настройке Seerr и укажите `http://jellyfin:8096`. Библиотеки добавлять не нужно. Настройте индексаторы Jackett, перенесите URL/API-ключи в `.env`, выполните `npm run config:check` и переключите `APP_MODE=live`. Переменные описаны в [configuration.md](configuration.md).

| Сервис | Порт по умолчанию | Постоянные тома |
|---|---:|---|
| KinoHub | 4100 | нет |
| Seerr | 5055 | `seerr-config` |
| Jackett | 9117 | `jackett-config` |
| TorrServer | 8090 | `torrserver-data` |
| Jellyfin | 8096 | `jellyfin-config`, `jellyfin-cache` |

`docker compose down` сохраняет тома. Не используйте `docker compose down -v`, если не собираетесь безвозвратно удалить конфигурацию и базы. Перед обновлением делайте резервную копию томов.

## Только Seerr

```bash
docker compose -f compose.seerr.yaml up -d
```

Seerr откроется на `http://127.0.0.1:5055`, а настройки сохранятся в именованном томе. Этот вариант удобен, если остальные сервисы уже работают отдельно.
