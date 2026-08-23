#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
  echo "ERROR: copy .env.example to .env and fill in the CHANGE_ME values" >&2
  exit 1
fi

if grep -q 'CHANGE_ME' .env; then
  echo "ERROR: .env still contains CHANGE_ME placeholders" >&2
  exit 1
fi

for name in PUBLIC_APP_ORIGIN SEERR_URL SEERR_API_KEY JACKETT_URL PUBLIC_JACKETT_URL JACKETT_API_KEY TORRSERVER_URL PUBLIC_TORRSERVER_URL; do
  if ! grep -Eq "^${name}=.+" .env; then
    echo "ERROR: required value ${name} is missing from .env" >&2
    exit 1
  fi
done

docker compose config --quiet
docker compose up -d --build --wait
docker compose ps

echo "KinoHub is ready. Open PUBLIC_APP_ORIGIN from .env"
