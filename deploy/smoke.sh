#!/usr/bin/env bash
# Smoke test da stack (web + proxy /api + API + banco).
#
#   deploy/smoke.sh http://127.0.0.1:3101       # CI, contra o compose local
#   deploy/smoke.sh https://issoimporta.app     # produção, depois do deploy
#
# Só imprime caminho e status HTTP: o repositório é público e os logs do
# Actions também, então nada de corpo de resposta, header ou IP no log.

set -Eeuo pipefail

BASE_URL="${1:?uso: smoke.sh <base-url>}"
BASE_URL="${BASE_URL%/}"
TENTATIVAS="${SMOKE_TENTATIVAS:-30}"
falhas=0

CORPO="$(mktemp)"
HEADERS="$(mktemp)"
trap 'rm -f "$CORPO" "$HEADERS"' EXIT

# requisicao <metodo> <caminho> [dados-json] -> imprime o status HTTP
requisicao() {
  local metodo="$1" caminho="$2" dados="${3:-}"
  local args=(-sS -o "$CORPO" -D "$HEADERS" -w '%{http_code}' --max-time 15 -X "$metodo")

  if [[ -n "$dados" ]]; then
    args+=(-H 'Content-Type: application/json' --data "$dados")
  fi

  curl "${args[@]}" "$BASE_URL$caminho" 2>/dev/null || echo 000
}

ok() { printf '  ok    %s\n' "$1"; }
falha() { printf '  FALHA %s\n' "$1"; falhas=$((falhas + 1)); }

# espera <status-aceitos-regex> <metodo> <caminho> [dados]
espera() {
  local aceitos="$1" metodo="$2" caminho="$3" dados="${4:-}"
  local status
  status="$(requisicao "$metodo" "$caminho" "$dados")"

  if [[ "$status" =~ ^($aceitos)$ ]]; then
    ok "$metodo $caminho -> $status"
  else
    falha "$metodo $caminho -> $status (esperado $aceitos)"
  fi
}

echo "Aguardando $BASE_URL/api/health ..."
for ((i = 1; i <= TENTATIVAS; i++)); do
  if [[ "$(requisicao GET /api/health)" == 200 ]]; then
    break
  fi
  if ((i == TENTATIVAS)); then
    echo "  FALHA /api/health não respondeu 200 após $TENTATIVAS tentativas"
    exit 1
  fi
  sleep 5
done

echo "Health"
status="$(requisicao GET /api/health)"
if [[ "$status" == 200 ]] && grep -q '"status":"ok"' "$CORPO"; then
  ok "GET /api/health -> 200 {status: ok}"
else
  falha "GET /api/health -> $status"
fi
if grep -qi '^cache-control:.*no-store' "$HEADERS"; then
  ok "/api/health com Cache-Control: no-store"
else
  falha "/api/health sem Cache-Control: no-store"
fi

echo "Páginas"
espera '200|307|308' GET /
espera 200 GET /parceiros
espera 200 GET /login
espera 200 GET /cadastro
espera 200 GET /cadastro-instituicao
espera 404 GET /pagina-que-nao-existe-smoke

echo "API pelo proxy /api"
status="$(requisicao GET /api/causas)"
if [[ "$status" == 200 ]] && [[ "$(head -c 1 "$CORPO")" == '[' ]]; then
  ok "GET /api/causas -> 200 (lista)"
else
  falha "GET /api/causas -> $status"
fi
espera 200 GET /api/empresas/publicas
# Login com conta inexistente: exercita validação, hash e banco sem 5xx.
espera '401|422' POST /api/sessoes \
  "{\"email\":\"smoke-$(date +%s)@invalido.issoimporta.app\",\"senha\":\"senha-errada-123\"}"
# Rota protegida sem sessão.
espera 401 GET /api/empresas/me
espera 401 GET /api/admin/empresas

echo "Superfície exposta"
# Swagger desligado em produção (SWAGGER_ENABLED=false).
espera 404 GET /api/docs
espera 404 GET /api/docs/openapi.json

if [[ "$BASE_URL" == https://* ]]; then
  echo "HTTPS"
  requisicao GET / >/dev/null
  if grep -qi '^strict-transport-security:' "$HEADERS"; then
    ok "HSTS presente"
  else
    falha "HSTS ausente"
  fi
  if grep -qi '^x-content-type-options: *nosniff' "$HEADERS"; then
    ok "X-Content-Type-Options: nosniff"
  else
    falha "X-Content-Type-Options ausente"
  fi
  if grep -qi '^x-powered-by:' "$HEADERS"; then
    falha "X-Powered-By exposto"
  else
    ok "sem X-Powered-By"
  fi
  http_status="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "http://${BASE_URL#https://}/" 2>/dev/null || echo 000)"
  if [[ "$http_status" =~ ^(301|308)$ ]]; then
    ok "HTTP redireciona para HTTPS ($http_status)"
  else
    falha "HTTP não redireciona para HTTPS ($http_status)"
  fi
fi

if ((falhas > 0)); then
  echo "Smoke test: $falhas falha(s)"
  exit 1
fi
echo "Smoke test: tudo ok"
