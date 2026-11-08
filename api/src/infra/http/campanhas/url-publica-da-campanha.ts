const WEB_URL_LOCAL = 'http://localhost:3001';

/**
 * Base do `web` para as URLs públicas. Em produção `WEB_URL` é obrigatório:
 * sem ele o QR impresso apontaria para `localhost` (design §Risks).
 */
export function lerWebUrl(): string {
  const webUrl = process.env.WEB_URL?.trim();

  if (webUrl) {
    return webUrl.replace(/\/+$/, '');
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('WEB_URL é obrigatório em produção');
  }

  return WEB_URL_LOCAL;
}

/** `{WEB_URL}/empresa/{slugEmpresa}/{slugCampanha}`: o destino do QR. */
export function urlPublicaDaCampanha(
  slugEmpresa: string,
  slugCampanha: string,
  webUrl: string = lerWebUrl(),
): string {
  return `${webUrl}/empresa/${slugEmpresa}/${slugCampanha}`;
}
