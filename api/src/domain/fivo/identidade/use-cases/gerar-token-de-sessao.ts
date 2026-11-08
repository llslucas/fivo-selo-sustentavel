import { createHash, randomBytes } from 'node:crypto';

const TOKEN_BYTES = 32; // 256 bits

export interface TokenDeSessao {
  token: string;
  tokenHash: string;
}

/** Hash guardado na `sessao`; o token cru só vive no cookie. */
export function hashDoTokenDeSessao(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Fonte única do token de sessão. Login e `SessionService` usam esta função
 * para que o formato do token e do hash não divirjam entre os dois caminhos.
 */
export function gerarTokenDeSessao(): TokenDeSessao {
  const token = randomBytes(TOKEN_BYTES).toString('hex');

  return { token, tokenHash: hashDoTokenDeSessao(token) };
}
