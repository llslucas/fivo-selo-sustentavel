#!/usr/bin/env bash
# Atalho para o docker compose de produção, já com as imagens em uso
# (gravadas em .versao-no-ar pelo deploy). Rode de qualquer pasta:
#
#   /var/www/issoimporta/dc.sh ps
#   /var/www/issoimporta/dc.sh logs --tail 200 api
#   /var/www/issoimporta/dc.sh exec api npm run seed:demo

set -Eeuo pipefail
cd "$(dirname "$(readlink -f "$0")")"

[[ -f .versao-no-ar ]] || { echo ".versao-no-ar ausente: rode um deploy primeiro" >&2; exit 1; }
exec docker compose --env-file .env --env-file .versao-no-ar -f docker-compose.prod.yml "$@"
