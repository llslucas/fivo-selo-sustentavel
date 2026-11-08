import { Injectable } from '@nestjs/common';
import { toString as qrCodeEmSvg } from 'qrcode';

import {
  DadosDoSelo,
  RenderizadorDeSelo,
} from '@domain/fivo/campanhas/ports/renderizador-de-selo';
import {
  lerWebUrl,
  urlPublicaDaCampanha,
} from '@infra/http/campanhas/url-publica-da-campanha';

const LARGURA = 300;
const ALTURA = 380;
const QR_X = 40;
const QR_Y = 76;
const QR_LADO = 220;
const VERDE = '#1b5e20';
const FONTE = 'Arial, Helvetica, sans-serif';

/**
 * Selo genérico (AD-023): wordmark "Fivo", o texto fixo e o QR da página
 * pública. O QR sai em `<path>` vetorial; nenhum dado variável além da URL.
 */
@Injectable()
export class QrCodeRenderizadorDeSelo implements RenderizadorDeSelo {
  // Lido na construção: em produção, sem `WEB_URL` a app nem sobe.
  private readonly webUrl = lerWebUrl();

  async renderizar({
    slugEmpresa,
    slugCampanha,
  }: DadosDoSelo): Promise<string> {
    const url = urlPublicaDaCampanha(slugEmpresa, slugCampanha, this.webUrl);
    const qr = await qrCodeEmSvg(url, {
      type: 'svg',
      errorCorrectionLevel: 'Q',
      margin: 4,
    });

    // Aninha o `<svg>` do QR no template, posicionado e dimensionado. O fundo
    // do selo é verde: a zona clara em volta do QR é só a margem do próprio QR.
    const qrPosicionado = qr
      .trim()
      .replace(
        '<svg xmlns="http://www.w3.org/2000/svg" ',
        `<svg x="${QR_X}" y="${QR_Y}" width="${QR_LADO}" height="${QR_LADO}" `,
      );

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<svg xmlns="http://www.w3.org/2000/svg" width="${LARGURA}" height="${ALTURA}" viewBox="0 0 ${LARGURA} ${ALTURA}">`,
      `<rect width="${LARGURA}" height="${ALTURA}" rx="16" fill="${VERDE}"/>`,
      `<text x="${LARGURA / 2}" y="58" text-anchor="middle" font-family="${FONTE}" font-size="40" font-weight="700" fill="#ffffff">Fivo</text>`,
      qrPosicionado,
      `<text x="${LARGURA / 2}" y="340" text-anchor="middle" font-family="${FONTE}" font-size="20" font-weight="700" fill="#ffffff">Selo Sustentável Fivo</text>`,
      '</svg>',
      '',
    ].join('\n');
  }
}
