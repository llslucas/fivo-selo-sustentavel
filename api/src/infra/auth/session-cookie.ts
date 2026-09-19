import type { Response } from 'express';

import { NOME_COOKIE_SESSAO } from './auth.constants';

function opcoesDoCookie() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
  };
}

export function definirCookieDeSessao(resposta: Response, token: string): void {
  resposta.cookie(NOME_COOKIE_SESSAO, token, opcoesDoCookie());
}

export function limparCookieDeSessao(resposta: Response): void {
  resposta.clearCookie(NOME_COOKIE_SESSAO, opcoesDoCookie());
}
