# Что записывать в `.env`

Скопируйте `.env.example` в файл с именем `.env`. Это личный файл конкретного сервера: в нём находятся адреса и API-ключи. Git его игнорирует.

## Пример для одного домашнего сервера

Допустим, IP сервера — `192.168.1.50`, а Seerr, Jackett и TorrServer работают прямо на нём:

```dotenv
APP_MODE=live
PUBLIC_APP_ORIGIN=http://192.168.1.50:4100
KINOHUB_PORT=4100
LAN_BIND=0.0.0.0

SEERR_URL=http://host.docker.internal:5055
SEERR_API_KEY=вставьте_ключ_из_Seerr
SEERR_SERVER_ID=1
SEERR_PROFILE_ID=1

JACKETT_URL=http://host.docker.internal:9117
PUBLIC_JACKETT_URL=http://host.docker.internal:9117
JACKETT_API_KEY=вставьте_ключ_из_Jackett

TORRSERVER_URL=http://host.docker.internal:8090
PUBLIC_TORRSERVER_URL=http://192.168.1.50:8090

KINOPOISK_API_KEY=
POISKKINO_API_KEY=
```

`host.docker.internal` означает «тот же компьютер, на котором запущен Docker». Этот адрес нужен контейнеру. Телевизор его не понимает, поэтому в `PUBLIC_*` всегда указывайте настоящий IP или hostname сервера.

## Где брать значения

### `SEERR_API_KEY`

Откройте Seerr → **Settings → General → API Key**. Ключ уже создан автоматически; при необходимости рядом есть кнопка генерации нового. Seerr предупреждает, что этот ключ даёт административный доступ, поэтому его нельзя публиковать. [Официальная страница Seerr](https://docs.seerr.dev/using-seerr/settings/general/).

### `SEERR_SERVER_ID` и `SEERR_PROFILE_ID`

Это идентификаторы Radarr-сервера и профиля качества, которые Seerr использует при заявке фильма. Для первой попытки оставьте `1` и `1` — это типичные ID первой конфигурации. Если добавление фильма завершается ошибкой, проверьте выбранные Radarr server и quality profile в **Seerr → Settings → Services**. API key самого Radarr находится в **Radarr → Settings → General → Security**, что также указано в [официальной инструкции Seerr](https://docs.seerr.dev/using-seerr/settings/services/).

### `JACKETT_API_KEY`

Откройте главную страницу Jackett. API Key показан в верхней части Dashboard. Перед подключением KinoHub добавьте хотя бы один индексатор и нажмите у него **Test**. Справочник API находится в [официальной wiki Jackett](https://github.com/Jackett/Jackett/wiki/Jackett-API).

### TorrServer

API key не нужен. Проверьте страницу TorrServer в браузере и укажите её адрес. Официальный Docker-образ и варианты установки приведены в [репозитории TorrServer](https://github.com/YouROK/TorrServer).

### KinoPoisk и PoiskKino

Оба ключа необязательны. Они зависят от выбранного стороннего поставщика рейтингов и не требуются для каталога, поиска или воспроизведения. Если ключа нет, оставьте строку пустой.

## Проверка адресов

- `PUBLIC_APP_ORIGIN` должен открываться на телефоне и телевизоре в той же сети.
- `PUBLIC_TORRSERVER_URL` тоже должен открываться на телевизоре.
- Не используйте `localhost` в публичных адресах: для телевизора это сам телевизор, а не сервер.
- Если сервис находится в другом Docker Compose, соедините сети либо используйте реальный LAN IP.
- Порты `4100` и `8090` должны быть разрешены firewall только для домашней сети.

## Режимы

- `APP_MODE=live` — обычная работа; при незаполненных обязательных полях сервер не запустится.
- `APP_MODE=unconfigured` — первоначальная настройка полного набора контейнеров.
- `APP_MODE=mock` — демонстрационный каталог без внешних сервисов.

## Если запуск не удался

```bash
docker compose ps
docker compose logs --tail=100 kinohub
```

Сообщение `Некорректная переменная окружения` называет поле, которое нужно исправить, но никогда не выводит сам секрет. Если `.env` всё ещё содержит `CHANGE_ME`, deploy-скрипт остановится до сборки.

На Linux защитите файл командой `chmod 600 .env`. Если ключ случайно попал в Git, чат или скриншот, сразу создайте новый ключ в соответствующем сервисе.
