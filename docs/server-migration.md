# Перенос KinoHub на Ubuntu-сервер

## Граница этой инструкции

Локальная проверка не меняет сервер `192.168.0.168`. Перенос выполняйте только после отдельного согласования окна работ, адресов дисков и резервной копии.

1. Установите поддерживаемые Docker Engine и Compose plugin на Ubuntu, создайте отдельный каталог `/opt/kinohub`.
2. Скопируйте репозиторий без `.env`, `node_modules`, тестовых артефактов и медиа. Создайте `/opt/kinohub/.env` с правами `600`.
3. Подключите существующие каталоги медиа/downloads bind-mount-ами вместо named volumes; заранее проверьте UID/GID через `PUID` и `PGID`.
4. Выполните `docker compose config`, затем `docker compose up -d --build` и `docker compose ps`.
5. Проверьте `curl -fsS http://127.0.0.1:4100/api/health` и `KINOHUB_SMOKE_URL=http://127.0.0.1:4100 npm run smoke:docker`.
6. Публикуйте сервис в LAN только через отдельный reverse proxy с TLS и allowlist; не меняйте Compose-привязку `127.0.0.1` до проверки firewall.

Резервируйте перед каждым обновлением все config-тома и базы Seerr/Radarr/Sonarr/qBittorrent/Jackett/Jellyfin, а также настройки TorrServer. Медиа и downloads имеют отдельную политику копирования. Для отката: остановить новый стек без `-v`, вернуть предыдущий image digest/Compose и восстановить только изменившиеся config-тома. Не обновляйте одновременно образы и схему хранения — это сохраняет ясную границу отката.
