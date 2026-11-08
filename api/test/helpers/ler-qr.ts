import { Resvg } from '@resvg/resvg-js';
import jsQR from 'jsqr';

export interface Raster {
  pixels: Uint8ClampedArray;
  largura: number;
  altura: number;
}

/** Rasteriza o SVG como uma impressora/câmera veria. */
export function rasterizar(svg: string): Raster {
  const imagem = new Resvg(svg, {
    fitTo: { mode: 'width', value: 1200 },
    background: '#ffffff',
  }).render();

  return {
    pixels: new Uint8ClampedArray(imagem.pixels),
    largura: imagem.width,
    altura: imagem.height,
  };
}

/** Grade de módulos do símbolo, a partir dos padrões localizadores. */
export function gradeDoQr(raster: Raster) {
  const lido = jsQR(raster.pixels, raster.largura, raster.altura);
  if (!lido) {
    throw new Error('QR não decodificado');
  }

  const lado = 17 + 4 * lido.version;
  const { topLeftFinderPattern: tl, topRightFinderPattern: tr } = lido.location;
  const modulo = (tr.x - tl.x) / (lado - 7);
  const x0 = tl.x - 3.5 * modulo;
  const y0 = tl.y - 3.5 * modulo;

  /** Escuro no ponto (linha, coluna) em frações de módulo. */
  const escuro = (linha: number, coluna: number): boolean => {
    const x = Math.floor(x0 + coluna * modulo);
    const y = Math.floor(y0 + linha * modulo);
    const i = (y * raster.largura + x) * 4;
    const luminancia =
      (raster.pixels[i] + raster.pixels[i + 1] + raster.pixels[i + 2]) / 3;
    return luminancia < 128;
  };

  return { lido, lado, escuro };
}

/** Conteúdo do QR desenhado no SVG. */
export function lerQrDoSvg(svg: string): string {
  return gradeDoQr(rasterizar(svg)).lido.data;
}
