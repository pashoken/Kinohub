# KinoHub TV

KinoHub — домашний каталог фильмов и сериалов для Android TV и проекторов. Серверная часть запускается в Docker, а на телевизор устанавливается готовое APK-приложение. Вы выбираете фильм, KinoHub находит раздачи через Jackett и передаёт выбранную раздачу TorrServer для потокового просмотра.

Фильмы заранее не скачиваются и локальная медиатека не создаётся.

## Что входит в комплект

- **KinoHub** — интерфейс, который открывается в браузере и Android TV-приложении;
- **Seerr** — каталог, карточки, постеры и поиск;
- **Jellyfin** — нужен для первичной настройки и авторизации Seerr; хранить в нём фильмы не требуется;
- **Jackett** — ищет раздачи в добавленных вами индексаторах;
- **TorrServer** — подготавливает выбранную раздачу и отдаёт видеопоток телевизору.

Обычный путь выглядит так:

`Android TV → KinoHub → Jackett → TorrServer → внешний видеоплеер`

## Что потребуется

- домашний компьютер, мини-ПК или NAS, который остаётся включённым во время просмотра;
- Docker Engine с Docker Compose v2 или Docker Desktop;
- постоянный IP сервера в домашней сети, например `192.168.1.50`;
- Android TV/проектор с Android 6.0 или новее;
- Kodi (рекомендуется) либо другой плеер, умеющий открывать HTTP-видео;
- доступ к индексаторам, которые вы самостоятельно добавите в Jackett.

Если сервер находится в интернете, не открывайте административные панели и TorrServer всему интернету. Эта инструкция рассчитана прежде всего на доверенную домашнюю сеть.

### Нужен ли VPN

В некоторых сетях отдельные внешние ресурсы, используемые Seerr, Jackett или Docker, могут быть недоступны. В таком случае VPN должен работать на роутере или сервере с Docker — VPN только на телевизоре обычно не поможет контейнерам.

Важно сохранить прямой доступ внутри домашней сети к портам `4100` и `8090`. Не указывайте VPN-адрес в `PUBLIC_APP_ORIGIN` и `PUBLIC_TORRSERVER_URL`: там по-прежнему нужен обычный LAN IP сервера.

Варианты подключения, проверки и устранение типичных проблем подробно описаны в [инструкции по VPN и сети](docs/vpn.md).

## Самый простой вариант: установить всё с нуля

Этот путь подходит, если Seerr, Jellyfin, Jackett и TorrServer ещё не установлены.

### 1. Скачайте проект

Linux:

```bash
git clone https://github.com/pashoken/Kinohub.git kinohub
cd kinohub
```

Windows PowerShell:

```powershell
git clone https://github.com/pashoken/Kinohub.git kinohub
Set-Location kinohub
```

### 2. Узнайте IP сервера

Нужен адрес, который открывается с телефона и телевизора в вашей сети. В примерах ниже используется `192.168.1.50`; замените его на свой.

- Windows: выполните `ipconfig` и найдите **IPv4 Address**;
- Linux: выполните `hostname -I`;
- адрес не должен начинаться с `127.` и не должен быть `localhost`.

Желательно закрепить этот IP за сервером в настройках роутера, иначе после перезагрузки адрес может измениться.

### 3. Запустите сервисы для первоначальной настройки

На компьютере с монитором достаточно:

```bash
docker compose -f compose.full.yaml --profile full up -d
```

Если Docker работает на отдельном сервере без монитора, временно разрешите доступ к административным панелям из домашней сети.

Linux:

```bash
ADMIN_BIND=0.0.0.0 LAN_BIND=0.0.0.0 docker compose -f compose.full.yaml --profile full up -d
```

Windows PowerShell:

```powershell
$env:ADMIN_BIND="0.0.0.0"
$env:LAN_BIND="0.0.0.0"
docker compose -f compose.full.yaml --profile full up -d
```

Подождите 1–3 минуты и проверьте:

```bash
docker compose -f compose.full.yaml --profile full ps
```

Контейнеры должны иметь состояние `running` или `healthy`.

### 4. Настройте Jellyfin

1. Откройте `http://192.168.1.50:8096`.
2. Выберите язык и создайте администратора. Запомните логин и пароль — они понадобятся на следующем шаге.
3. Добавление библиотеки можно пропустить: KinoHub не хранит и не воспроизводит фильмы через Jellyfin.
4. Завершите мастер настройки.

Jellyfin остаётся в стеке, потому что владелец Seerr при первоначальной настройке привязывается к медиасерверу. Это описано в [официальной документации Seerr](https://docs.seerr.dev/using-seerr/users/owner/).

### 5. Настройте Seerr

1. Откройте `http://192.168.1.50:5055`.
2. Выберите вход через **Jellyfin**.
3. В качестве внутреннего адреса Jellyfin укажите `http://jellyfin:8096`. Это Docker-имя контейнера — здесь нельзя писать `localhost`.
4. Введите администратора Jellyfin, созданного на предыдущем шаге.
5. Если Seerr предложит выбрать библиотеки, продолжите без них.
6. В настройках пользователя установите русский язык, регион и язык поиска. Именно Seerr определяет, на каком языке KinoHub получает названия и описания.
7. Завершите мастер, откройте **Settings → General** и скопируйте **API Key**. Это значение `SEERR_API_KEY`.

API-ключ даёт административный доступ. Не публикуйте его в GitHub, issue, чатах и скриншотах. Подробнее: [официальная документация Seerr](https://docs.seerr.dev/using-seerr/settings/general/).

### 6. Настройте Jackett

1. Откройте `http://192.168.1.50:9117`.
2. Нажмите **Add indexer**.
3. Добавьте доступные вам индексаторы и выполните **Test** для каждого.
4. Вернитесь на Dashboard и скопируйте **API Key** из верхней части страницы. Это `JACKETT_API_KEY`.

Без работающего индексатора каталог будет открываться, но кнопка «Смотреть сейчас» не найдёт раздач. Справочник: [официальная wiki Jackett](https://github.com/Jackett/Jackett/wiki/Jackett-API).

Для работы KinoHub обязательны только два секрета: `SEERR_API_KEY` и `JACKETT_API_KEY`. Jellyfin и TorrServer отдельных ключей для этой конфигурации не требуют. `KINOPOISK_API_KEY` и `POISKKINO_API_KEY` необязательны — их можно оставить пустыми, основной каталог и просмотр продолжат работать.

### 7. Создайте `.env`

Скопируйте шаблон:

Linux:

```bash
cp .env.example .env
nano .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
```

Для полного Docker-стека файл должен выглядеть примерно так:

```dotenv
APP_MODE=live
PUBLIC_APP_ORIGIN=http://192.168.1.50:4100
KINOHUB_PORT=4100
LAN_BIND=0.0.0.0
ADMIN_BIND=127.0.0.1
TZ=Europe/Samara

SEERR_URL=http://seerr:5055
SEERR_API_KEY=ВСТАВЬТЕ_КЛЮЧ_SEERR

JACKETT_URL=http://jackett:9117
PUBLIC_JACKETT_URL=http://jackett:9117
JACKETT_API_KEY=ВСТАВЬТЕ_КЛЮЧ_JACKETT

TORRSERVER_URL=http://torrserver:8090
PUBLIC_TORRSERVER_URL=http://192.168.1.50:8090

JELLYFIN_URL=http://jellyfin:8096
PUID=1000
PGID=1000
SEERR_PORT=5055
JACKETT_PORT=9117
TORRSERVER_PORT=8090
JELLYFIN_PORT=8096

KINOPOISK_API_KEY=
POISKKINO_API_KEY=
```

Замените `192.168.1.50` на IP своего сервера и вставьте два API-ключа. Не добавляйте кавычки и пробелы вокруг `=`.

Значения `http://seerr:5055`, `http://jackett:9117`, `http://torrserver:8090` и `http://jellyfin:8096` менять не нужно: это внутренние адреса контейнеров.

`ADMIN_BIND=127.0.0.1` снова закрывает панели Seerr, Jackett и Jellyfin от других устройств. Если панели нужны постоянно из LAN, можно установить `ADMIN_BIND=0.0.0.0`, но только при настроенном firewall и в доверенной сети.

### 8. Перезапустите готовый стек

```bash
docker compose -f compose.full.yaml --profile full up -d --build --wait
```

Проверьте с телефона, подключённого к тому же Wi-Fi:

- `http://192.168.1.50:4100` — должен открыться KinoHub;
- `http://192.168.1.50:8090` — должен отвечать TorrServer.

Если оба адреса доступны с телефона, они обычно будут доступны и телевизору.

## Установка приложения на Android TV или проектор

> **[Скачать KinoHub TV v0.4.0 APK](https://github.com/pashoken/Kinohub/releases/download/v0.4.0/kinohub-tv-0.4.0.apk)**
>
> [Контрольная SHA-256](https://github.com/pashoken/Kinohub/releases/download/v0.4.0/kinohub-tv-0.4.0.apk.sha256) · Android 6.0+

1. Установите [Kodi](https://kodi.tv/download/android/) — это рекомендуемый плеер для телевизора и проектора. VLC и Vimu также можно использовать как альтернативу.
2. Скачайте APK на флешку либо сразу на телевизор.
3. Разрешите файловому менеджеру установку приложений из неизвестных источников.
4. Установите и запустите KinoHub.
5. Введите адрес сервера со слешем в конце, например `http://192.168.1.50:4100/`.
6. Откройте фильм, нажмите **Смотреть сейчас**, выберите раздачу и видеофайл.

APK подписан постоянным release-ключом, поэтому новую версию можно устанавливать поверх старой. Установка через ADB описана в [docs/android-tv.md](docs/android-tv.md).

Как KinoHub сортирует найденные раздачи и почему оригинальная английская дорожка сейчас получает дополнительный балл, описано в [инструкции по ранжированию раздач](docs/torrent-ranking.md). Там же показано, как отдать приоритет русской озвучке.

## Если Seerr, Jackett, TorrServer и Jellyfin уже установлены

В этом случае полный Compose не нужен. Используйте обычный [compose.yaml](compose.yaml) и укажите адреса существующих сервисов в `.env`.

Если сервисы работают на том же компьютере, что и Docker:

```dotenv
SEERR_URL=http://host.docker.internal:5055
JACKETT_URL=http://host.docker.internal:9117
PUBLIC_JACKETT_URL=http://host.docker.internal:9117
TORRSERVER_URL=http://host.docker.internal:8090
PUBLIC_TORRSERVER_URL=http://192.168.1.50:8090
JELLYFIN_URL=http://host.docker.internal:8096
```

Добавьте API-ключи Seerr и Jackett, затем запустите:

Linux:

```bash
bash scripts/deploy.sh
```

Windows PowerShell:

```powershell
.\scripts\deploy.ps1
```

Если сервисы находятся на другом компьютере, вместо `host.docker.internal` укажите его настоящий LAN IP.

## Как проверить, что всё работает

1. Откройте KinoHub в браузере и убедитесь, что появились постеры.
2. Выполните поиск фильма — это проверяет Seerr.
3. Нажмите **Смотреть сейчас** — должны появиться варианты раздач из Jackett.
4. Выберите раздачу и файл — Android должен предложить открыть внешний плеер.
5. Если каталог работает, но раздач нет, сначала откройте Jackett и повторите **Test** индексатора.

## Частые проблемы

### Страница не открывается с телевизора

- проверьте, что телевизор и сервер находятся в одной сети;
- убедитесь, что в адресе указан IP сервера, а не `localhost`;
- разрешите TCP-порты `4100` и `8090` в firewall только для домашней сети;
- проверьте адрес с телефона по Wi-Fi.

### Seerr не подключается к Jellyfin

В мастере Seerr используйте `http://jellyfin:8096`, если оба сервиса запущены через `compose.full.yaml`. Адрес `localhost:8096` внутри контейнера указывает на сам Seerr и работать не будет.

### Каталог открывается, но раздач нет

Проверьте индексаторы в Jackett кнопкой **Test**, API-ключ в `.env` и журнал KinoHub:

```bash
docker compose -f compose.full.yaml --profile full logs --tail=100 kinohub
```

Если тест индексатора не проходит только без VPN, настройте VPN на сервере или роутере по [отдельной инструкции](docs/vpn.md).

### Видео не запускается

- откройте `http://IP_СЕРВЕРА:8090` с телевизора;
- установите внешний видеоплеер;
- попробуйте другую раздачу или другой видеофайл;
- убедитесь, что firewall не блокирует порт `8090`.

### Контейнер не становится healthy

```bash
docker compose -f compose.full.yaml --profile full ps
docker compose -f compose.full.yaml --profile full logs --tail=100
```

## Обновление и резервная копия

Полный стек:

```bash
git pull
docker compose -f compose.full.yaml --profile full up -d --build --wait
```

Только KinoHub с внешними сервисами:

```bash
git pull
bash scripts/deploy.sh
```

Файл `.env` и Docker-тома при обновлении сохраняются. Для резервной копии важны тома `seerr-config`, `jackett-config`, `torrserver-data`, `jellyfin-config` и `jellyfin-cache`.

Не выполняйте `docker compose down -v`: параметр `-v` удаляет настройки и базы контейнеров.

## Полезные команды

```bash
docker compose -f compose.full.yaml --profile full ps
docker compose -f compose.full.yaml --profile full logs -f
docker compose -f compose.full.yaml --profile full restart
docker compose -f compose.full.yaml --profile full down
```

Подробное описание переменных: [docs/configuration.md](docs/configuration.md). Инструкция для Android TV: [docs/android-tv.md](docs/android-tv.md). VPN и сеть: [docs/vpn.md](docs/vpn.md). Правила сортировки раздач: [docs/torrent-ranking.md](docs/torrent-ranking.md).

## Для разработчиков

Без `.env` проект запускается с демонстрационным каталогом:

```bash
npm ci
npm run dev
```

UI: `http://127.0.0.1:5173`. Проверки: `npm run build`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run check:secrets`.
