#!/usr/bin/env bash
# Roda NO SERVIDOR. Chamado por deploy/deploy-manual.ps1 depois de enviar e
# extrair o release em <deploy-dir>/releases/<tag>:
#
#   bash <deploy-dir>/releases/<tag>/deploy/remote-manual.sh <deploy-dir> <tag>
#
# Faz o build das imagens aqui mesmo (nada vai para registry público) e passa
# para o remote-deploy.sh: backup do banco, migrations, up, espera o health e
# volta a versão anterior se falhar. Depois roda o smoke test em 127.0.0.1.

set -Eeuo pipefail

DEPLOY_DIR="${1:?uso: remote-manual.sh <deploy-dir> <tag>}"
TAG="${2:?uso: remote-manual.sh <deploy-dir> <tag>}"
RELEASE="$DEPLOY_DIR/releases/$TAG"
MANTIDOS=3

log() { printf '[deploy] %s\n' "$*"; }

command -v docker >/dev/null || { log "docker não encontrado no servidor"; exit 1; }
docker compose version >/dev/null 2>&1 || { log "plugin docker compose ausente no servidor"; exit 1; }
[[ -d "$RELEASE/api" && -d "$RELEASE/web" ]] || { log "release incompleto em $RELEASE"; exit 1; }
[[ -f "$DEPLOY_DIR/.env" ]] || { log ".env ausente em $DEPLOY_DIR"; exit 1; }

install -m 644 "$RELEASE/deploy/docker-compose.prod.yml" "$DEPLOY_DIR/docker-compose.prod.yml"
install -m 755 "$RELEASE/deploy/remote-deploy.sh" "$DEPLOY_DIR/remote-deploy.sh"
install -m 755 "$RELEASE/deploy/dc.sh" "$DEPLOY_DIR/dc.sh"

API_IMAGE="issoimporta-api:$TAG"
WEB_IMAGE="issoimporta-web:$TAG"

log "build da API ($API_IMAGE)"
docker build --pull -t "$API_IMAGE" "$RELEASE/api"
log "build do web ($WEB_IMAGE)"
docker build --pull --build-arg API_URL=http://api:3000 -t "$WEB_IMAGE" "$RELEASE/web"

status=0
PULAR_PULL=1 bash "$DEPLOY_DIR/remote-deploy.sh" "$API_IMAGE" "$WEB_IMAGE" </dev/null || status=$?

if ((status == 0)); then
  web_port="$(sed -n "s/^WEB_PORT='\([0-9]*\)'$/\1/p" "$DEPLOY_DIR/.env")"
  if command -v curl >/dev/null; then
    log "smoke test em http://127.0.0.1:${web_port:-3101}"
    SMOKE_TENTATIVAS=12 bash "$RELEASE/deploy/smoke.sh" "http://127.0.0.1:${web_port:-3101}" || status=$?
  else
    log "curl ausente no servidor: smoke test pulado"
  fi
fi

# Limpeza: mantém os releases e as imagens mais recentes. As tags começam com
# data e hora, então a ordem alfabética é a cronológica. Imagem em uso por
# container não sai (o `docker image rm` recusa), então o rollback continua
# possível.
find "$DEPLOY_DIR/releases" -mindepth 1 -maxdepth 1 -type d -printf '%f\n' |
  sort -r | tail -n +$((MANTIDOS + 1)) |
  while read -r antigo; do rm -rf "${DEPLOY_DIR:?}/releases/${antigo:?}"; done
for repo in issoimporta-api issoimporta-web; do
  docker image ls "$repo" --format '{{.Tag}}' | sort -r | tail -n +$((MANTIDOS + 1)) |
    while read -r t; do docker image rm "$repo:$t" >/dev/null 2>&1 || true; done
done

exit "$status"
