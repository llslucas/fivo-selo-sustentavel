import type { Response } from 'express';

import { NOME_COOKIE_SESSAO } from './auth.constants';

// HTTPS é obrigatório em produção (EMP-06 AC7): sem a env, `Secure` liga sozinho.
function cookieSeguro(): boolean {
  const configurado = process.env.COOKIE_SECURE;

  return configurado
    ? configurado === 'true'
    : process.env.NODE_ENV === 'production';
}

function opcoesDoCookie() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: cookieSeguro(),
    path: '/',
  };
}

export function definirCookieDeSessao(resposta: Response, token: string): void {
  resposta.cookie(NOME_COOKIE_SESSAO, token, opcoesDoCookie());
}

export function limparCookieDeSessao(resposta: Response): void {
  resposta.clearCookie(NOME_COOKIE_SESSAO, opcoesDoCookie());
}
