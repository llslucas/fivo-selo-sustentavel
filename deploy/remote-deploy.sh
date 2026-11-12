#!/usr/bin/env bash
# Roda NO SERVIDOR. Dois jeitos de chamar:
#
#   Workflow (imagens do GHCR):
#     printf '%s\n' "$GHCR_TOKEN" | ssh ... "bash $DEPLOY_DIR/remote-deploy.sh <api-image> <web-image> <ghcr-user>"
#
#   Deploy manual (imagens já construídas no servidor por remote-manual.sh):
#     PULAR_PULL=1 bash remote-deploy.sh <api-image> <web-image> </dev/null
#
# O token do GHCR chega pela stdin (não aparece em `ps` nem no histórico) e
# é o GITHUB_TOKEN do job: expira sozinho quando o job termina. O login no
# registry é desfeito no fim do script.
#
# Passos: login GHCR -> pull -> backup do banco -> migrations + up ->
# espera o health -> grava a versão no ar. Se o health falhar, volta para a
# versão anterior (as migrations já aplicadas não são revertidas).

set -Eeuo pipefail

cd "$(dirname "$(readlink -f "$0")")"

API_IMAGE_NOVA="${1:?uso: remote-deploy.sh <api-image> <web-image> [ghcr-user]}"
WEB_IMAGE_NOVA="${2:?uso: remote-deploy.sh <api-image> <web-image> [ghcr-user]}"
GHCR_USER="${3:-}"
PULAR_PULL="${PULAR_PULL:-0}"
GHCR_TOKEN=""
if [[ -n "$GHCR_USER" ]]; then
  IFS= read -r GHCR_TOKEN || true
fi

COMPOSE_FILE="docker-compose.prod.yml"
VERSAO_NO_AR=".versao-no-ar"
BACKUP_DIR="backups"
BACKUPS_MANTIDOS=10
ESPERA_HEALTH_S=240

log() { printf '[deploy] %s\n' "$*"; }
compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

[[ -f .env ]] || { log ".env ausente em $(pwd)"; exit 1; }
chmod 600 .env

# shellcheck disable=SC2329  # chamada pelo trap
limpar() {
  docker logout ghcr.io >/dev/null 2>&1 || true
}
trap limpar EXIT

if [[ -n "$GHCR_TOKEN" ]]; then
  printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null
  unset GHCR_TOKEN
  log "login no GHCR ok"
fi

subir() {
  export API_IMAGE="$1" WEB_IMAGE="$2"
  # `up` roda o serviço migrate antes da API (depends_on).
  compose up -d --remove-orphans
}

esperar_saudavel() {
  local limite=$((SECONDS + ESPERA_HEALTH_S)) cid estado
  while ((SECONDS < limite)); do
    cid="$(compose ps -q web 2>/dev/null || true)"
    if [[ -n "$cid" ]]; then
      estado="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || echo desconhecido)"
      if [[ "$estado" == healthy ]]; then
        return 0
      fi
    fi
    sleep 5
  done
  return 1
}

backup_banco() {
  local cid arquivo
  cid="$(compose ps -q postgres 2>/dev/null || true)"
  if [[ -z "$cid" ]] || [[ "$(docker inspect -f '{{.State.Running}}' "$cid" 2>/dev/null)" != true ]]; then
    log "postgres ainda não está rodando: sem backup (primeiro deploy?)"
    return 0
  fi

  mkdir -p "$BACKUP_DIR"
  chmod 700 "$BACKUP_DIR"
  arquivo="$BACKUP_DIR/pre-deploy-$(date -u +%Y%m%dT%H%M%SZ).dump"
  (
    umask 077
    # shellcheck disable=SC2016  # as variáveis expandem dentro do container
    compose exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' >"$arquivo"
  )
  log "backup do banco: $arquivo ($(du -h "$arquivo" | cut -f1))"

  # Mantém só os mais recentes.
  find "$BACKUP_DIR" -maxdepth 1 -name 'pre-deploy-*.dump' -printf '%T@ %p\n' |
    sort -rn | tail -n +$((BACKUPS_MANTIDOS + 1)) | cut -d' ' -f2- | xargs -r rm -f
}

if [[ "$PULAR_PULL" == 1 ]]; then
  log "usando imagens locais: $API_IMAGE_NOVA, $WEB_IMAGE_NOVA"
else
  log "baixando imagens"
  API_IMAGE="$API_IMAGE_NOVA" WEB_IMAGE="$WEB_IMAGE_NOVA" compose pull --quiet
fi

backup_banco

log "subindo nova versão (migrations rodam antes da API)"
if subir "$API_IMAGE_NOVA" "$WEB_IMAGE_NOVA" && esperar_saudavel; then
  printf 'API_IMAGE=%s\nWEB_IMAGE=%s\n' "$API_IMAGE_NOVA" "$WEB_IMAGE_NOVA" >"$VERSAO_NO_AR"
  compose ps --format 'table {{.Service}}\t{{.Status}}'
  docker image prune -f >/dev/null 2>&1 || true
  log "deploy ok"
  exit 0
fi

log "nova versão não ficou saudável em ${ESPERA_HEALTH_S}s"
compose ps --format 'table {{.Service}}\t{{.Status}}' || true
log "detalhes no servidor: docker compose -f $(pwd)/$COMPOSE_FILE logs --tail 200 api web migrate"

if [[ -f "$VERSAO_NO_AR" ]]; then
  # shellcheck disable=SC1090
  source "$VERSAO_NO_AR"
  log "voltando para a versão anterior"
  if subir "$API_IMAGE" "$WEB_IMAGE" && esperar_saudavel; then
    log "rollback ok: versão anterior no ar"
  else
    log "ROLLBACK FALHOU: verifique o servidor"
  fi
fi
exit 1
