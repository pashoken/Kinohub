# KinoHub TV

KinoHub превращает домашний сервер в удобный каталог кино для телевизора или проектора. На сервере работает Docker-контейнер, а на Android TV устанавливается небольшое приложение KinoHub. Приложение показывает каталог, ищет фильм через подключённые сервисы и передаёт выбранное видео внешнему плееру.

## Как это устроено

KinoHub объединяет три самостоятельных сервиса:

- **Seerr** даёт каталог фильмов и сериалов, постеры, поиск и заявки;
- **Jackett** ищет доступные раздачи по подключённым индексаторам;
- **TorrServer** превращает выбранную раздачу в видеопоток для телевизора.

KinoHub не заменяет эти сервисы, а создаёт над ними единый TV-интерфейс. Если Seerr, Jackett и TorrServer уже установлены, достаточно указать два API-ключа и адреса. Если их ещё нет, ниже есть отдельный путь первоначальной настройки.

## Что понадобится

- компьютер, NAS или VPS с установленными Docker и Docker Compose;
- постоянный IP-адрес сервера в домашней сети, например `192.168.1.50`;
- Seerr, Jackett и TorrServer на этом или другом сервере;
- Android TV, Android-проектор либо обычный браузер для просмотра интерфейса.

Необязательные ключи KinoPoisk/PoiskKino влияют только на дополнительный рейтинг. Без них основная работа KinoHub сохраняется.

## Шаг 1. Получить адреса и API-ключи

### Seerr

1. Откройте Seerr в браузере, обычно `http://IP_СЕРВЕРА:5055`.
2. Завершите первоначальную настройку, если Seerr запускается впервые.
3. Откройте **Settings → General → API Key**.
4. Скопируйте ключ — это `SEERR_API_KEY`.
5. Адрес страницы Seerr без лишнего пути — это `SEERR_URL`.

[Официальная инструкция Seerr по API Key](https://docs.seerr.dev/using-seerr/settings/general/)

### Jackett

1. Откройте Jackett, обычно `http://IP_СЕРВЕРА:9117`.
2. Добавьте и проверьте нужные индексаторы.
3. Скопируйте **API Key** в верхней части Dashboard — это `JACKETT_API_KEY`.
4. Адрес Jackett — это `JACKETT_URL` и, в простом домашнем варианте, `PUBLIC_JACKETT_URL`.

[Официальная документация Jackett API](https://github.com/Jackett/Jackett/wiki/Jackett-API)

### TorrServer

TorrServer не выдаёт отдельный API-ключ. Нужны только два адреса:

- `TORRSERVER_URL` — адрес, по которому Docker-контейнер KinoHub видит TorrServer;
- `PUBLIC_TORRSERVER_URL` — адрес, который открывается на телевизоре, например `http://192.168.1.50:8090`.

[Официальный проект и установка TorrServer](https://github.com/YouROK/TorrServer)

Подробные примеры адресов и объяснение всех переменных находятся в [docs/configuration.md](docs/configuration.md).

## Шаг 2. Развернуть KinoHub

На Linux-сервере:

```bash
git clone https://github.com/pashoken/Kinohub.git kinohub
cd kinohub
cp .env.example .env
nano .env
```

В `.env` замените все значения `CHANGE_ME`, сохраните файл и выполните:

```bash
bash scripts/deploy.sh
```

В Windows PowerShell:

```powershell
git clone https://github.com/pashoken/Kinohub.git kinohub
Set-Location kinohub
Copy-Item .env.example .env
notepad .env
.\scripts\deploy.ps1
```

Скрипт проверит настройки, соберёт контейнер и дождётся готовности. После запуска откройте в браузере значение `PUBLIC_APP_ORIGIN`, например `http://192.168.1.50:4100`.

Полезные команды:

```bash
docker compose ps          # состояние
docker compose logs -f     # журнал работы; выход — Ctrl+C
docker compose restart     # перезапуск
docker compose down        # остановка без удаления настроек внешних сервисов
```

## Шаг 3. Подключить телевизор или проектор

KinoHub имеет собственную Android TV оболочку. При первом запуске она просит адрес сервера, сохраняет его и дальше открывает TV-интерфейс автоматически. Для воспроизведения используется установленный на устройстве видеоплеер.

1. Разверните сервер и убедитесь, что адрес KinoHub открывается с телефона по Wi-Fi.
2. Установите APK на Android TV/проектор, разрешив установку из неизвестных источников.
3. Запустите KinoHub и введите адрес, например `http://192.168.1.50:4100/`.
4. Убедитесь, что устройство также открывает `PUBLIC_TORRSERVER_URL`.

Сейчас репозиторий содержит исходники APK, но не публичный production-релиз: имеющийся локальный APK подписан тестовым ключом. Инструкция для сборки и будущей публикации находится в [docs/android-tv.md](docs/android-tv.md). До появления подписанного релиза интерфейс можно открыть обычным браузером телевизора.

## Если Seerr, Jackett и TorrServer ещё не установлены

В [compose.full.yaml](compose.full.yaml) есть полный набор контейнеров: Seerr, Radarr, Sonarr, qBittorrent, Jackett, TorrServer и Jellyfin. Это не полностью автоматический этап: при первом запуске у каждого сервиса нужно открыть Web UI, создать пользователя, добавить индексаторы и связать сервисы между собой. Пошаговый порядок описан в [docs/local-docker.md](docs/local-docker.md).

## Обновление

```bash
cd kinohub
git pull
bash scripts/deploy.sh
```

`.env` при обновлении не перезаписывается. Никогда не публикуйте его и не присылайте API-ключи в issue или скриншотах.

## Для разработчиков

Без `.env` проект запускается с безопасным демонстрационным каталогом:

```bash
npm ci
npm run dev
```

UI: `http://127.0.0.1:5173`. Проверки: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run check:secrets`.
