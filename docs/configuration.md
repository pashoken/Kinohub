# Настройка production-коробки

## Минимальный порядок действий

1. Скопируйте `.env.example` в `.env`.
2. Замените все `CHANGE_ME`; пустыми можно оставить только необязательные ключи рейтингов и диагностические URL.
3. Выполните `bash scripts/deploy.sh` на Linux/macOS или `.\scripts\deploy.ps1` в PowerShell.
4. Откройте `PUBLIC_APP_ORIGIN` в браузере или на телевизоре.

`.env` — единственный конфигурационный файл экземпляра. Переменные окружения процесса имеют приоритет. Файл исключён из Git и Docker build context.

## Обязательные настройки

| Переменная | Что указать |
|---|---|
| `PUBLIC_APP_ORIGIN` | Адрес KinoHub, открываемый пользователем, например `http://192.168.1.50:4100` |
| `KINOHUB_PORT` | Публичный порт KinoHub, обычно `4100` |
| `LAN_BIND` | `0.0.0.0` для LAN или конкретный IP интерфейса |
| `SEERR_URL` | Адрес Seerr, доступный из контейнера KinoHub |
| `SEERR_API_KEY` | API key из настроек Seerr |
| `SEERR_SERVER_ID`, `SEERR_PROFILE_ID` | ID Radarr-сервера и quality profile, подключённых в Seerr |
| `JACKETT_URL` | Адрес Jackett, доступный KinoHub |
| `PUBLIC_JACKETT_URL` | Адрес Jackett, доступный TorrServer; часто совпадает с `JACKETT_URL` |
| `JACKETT_API_KEY` | API key из верхней части панели Jackett |
| `TORRSERVER_URL` | Адрес TorrServer, доступный KinoHub |
| `PUBLIC_TORRSERVER_URL` | Адрес TorrServer, доступный телевизору/браузеру |

Если сервисы работают на том же Linux-хосте вне текущего Compose, используйте `host.docker.internal`; deployment Compose добавляет для него `host-gateway`. Например:

```dotenv
SEERR_URL=http://host.docker.internal:5055
JACKETT_URL=http://host.docker.internal:9117
PUBLIC_JACKETT_URL=http://host.docker.internal:9117
TORRSERVER_URL=http://host.docker.internal:8090
```

Публичные URL при этом должны содержать реальный LAN IP/hostname сервера, а не `localhost` и не `host.docker.internal`.

## Необязательные API

| Переменная | Назначение |
|---|---|
| `KINOPOISK_API_KEY` | UUID-ключ используемого KinoPoisk API-провайдера для рейтингов |
| `POISKKINO_API_KEY` | Fallback-провайдер рейтингов |
| `RADARR_URL`, `JELLYFIN_URL` | Отображение состояния в диагностике интеграций |

KinoHub не передаёт логин/пароль TorrServer. Держите TorrServer в доверенной LAN или за отдельным reverse proxy с собственной аутентификацией.

## Режимы

- `APP_MODE=live` — production; приложение не стартует, если обязательные интеграции заполнены не полностью.
- `APP_MODE=unconfigured` — первичная настройка bundled-стека.
- `APP_MODE=mock` — разработка без внешних сервисов.

Проверка установленной Node-конфигурации без вывода ключей: `npm run config:check`.

## Безопасность и обновление

- На Linux выполните `chmod 600 .env`.
- Не используйте `VITE_*` для секретов: такие значения попадут в браузерный bundle.
- Не публикуйте административные панели в интернет. Для внешнего доступа используйте TLS, firewall/VPN и reverse proxy.
- После утечки ключ необходимо отозвать и выпустить заново; удаления из Git недостаточно.
- Обновление выполняется повторным запуском `scripts/deploy.sh`; откат — запуском предыдущего Git tag/image.
