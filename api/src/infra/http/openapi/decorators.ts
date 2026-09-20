import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiResponse } from '@nestjs/swagger';

import { ERRO_RESPOSTA } from './esquema-openapi';

// Nome do esquema de segurança que `addCookieAuth` registra por padrão.
const ESQUEMA_COOKIE = 'cookie';

/** Resposta de erro no formato `ErroResposta` (filter e pipe de validação). */
export function ApiErro(status: number, description: string) {
  return ApiResponse({ status, description, schema: ERRO_RESPOSTA });
}

/**
 * Rota que exige sessão: declara o cookie como segurança e o 401 do
 * `AuthGuard`; `comPapel` acrescenta o 403 do `RolesGuard`.
 */
export function ApiProtegida(opcoes: { comPapel?: boolean } = {}) {
  return applyDecorators(
    ApiCookieAuth(ESQUEMA_COOKIE),
    ApiErro(401, 'Sessão ausente, inválida ou expirada'),
    ...(opcoes.comPapel ? [ApiErro(403, 'Acesso negado')] : []),
  );
}
