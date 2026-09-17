import { Either, left, right } from '@core/either';
import { Entity } from '@core/types/entities/entity';
import { ArquivoInvalidoError } from '../application/errors/arquivo-invalido-error';

export enum TipoArquivo {
  LOGO_EMPRESA = 'LOGO_EMPRESA',
  // FOTO_PERFIL = 'FOTO_PERFIL',
  // BANNER = 'BANNER',
  // DOCUMENTO = 'DOCUMENTO',
}

export interface ArquivoInput {
  tipo: TipoArquivo;
  nomeOriginal: string;
  mime: string;
  bytes: number;
  largura?: number;
  altura?: number;
  chaveStorage: string;
  svgConteudo?: string;
}

export interface ArquivoProps {
  tipo: TipoArquivo;
  nomeOriginal: string;
  mime: string;
  bytes: number;
  largura?: number | null;
  altura?: number | null;
  chaveStorage: string;
  svgConteudo?: string | null;
}

export class Arquivo extends Entity<ArquivoProps> {
  static criar(input: ArquivoInput): Either<ArquivoInvalidoError, Arquivo> {
    const formatosAceitosPorTipo: Record<TipoArquivo, string[]> = {
      [TipoArquivo.LOGO_EMPRESA]: ['image/png', 'image/jpeg', 'image/svg+xml'],
    };

    const formatosAceitos = formatosAceitosPorTipo[input.tipo] ?? [];

    if (!formatosAceitos.includes(input.mime)) {
      return left(
        new ArquivoInvalidoError(
          `Arquivo inválido para ${input.tipo}: formato ${input.mime} fora da lista aceita. Formatos aceitos: ${formatosAceitos.join(', ')}`,
        ),
      );
    }

    const limiteEmBytes = 5 * 1024 * 1024;
    if (input.bytes > limiteEmBytes) {
      return left(
        new ArquivoInvalidoError(
          `Arquivo inválido: tamanho excede o limite de 5 MB (${input.bytes} bytes).`,
        ),
      );
    }

    if (input.mime === 'image/svg+xml') {
      if (!input.svgConteudo || input.svgConteudo.trim().length === 0) {
        return left(
          new ArquivoInvalidoError(
            'Arquivo SVG inválido: svgConteudo é obrigatório.',
          ),
        );
      }

      const svg = input.svgConteudo.toLowerCase();
      const possuiConteudoInseguro =
        /<script\b|<foreignobject\b|on[a-z0-9_-]+\s*=/.test(svg);

      if (possuiConteudoInseguro) {
        return left(
          new ArquivoInvalidoError(
            'Arquivo SVG inválido: conteúdo contém script, foreignObject ou atributos onload/onclick/on*.',
          ),
        );
      }
    } else {
      const largura = Number(input.largura ?? 0);
      const altura = Number(input.altura ?? 0);

      if (largura < 512 || altura < 512) {
        return left(
          new ArquivoInvalidoError(
            'Arquivo inválido: dimensão mínima de 512x512 pixels para raster.',
          ),
        );
      }
    }

    const arquivo = new Arquivo({
      tipo: input.tipo,
      nomeOriginal: input.nomeOriginal,
      mime: input.mime,
      bytes: input.bytes,
      largura: input.largura ?? null,
      altura: input.altura ?? null,
      chaveStorage: input.chaveStorage,
      svgConteudo: input.svgConteudo ?? null,
    });

    return right(arquivo);
  }

  get tipo(): TipoArquivo {
    return this._props.tipo;
  }

  get nomeOriginal(): string {
    return this._props.nomeOriginal;
  }

  get mime(): string {
    return this._props.mime;
  }

  get bytes(): number {
    return this._props.bytes;
  }

  get largura(): number | null | undefined {
    return this._props.largura;
  }

  get altura(): number | null | undefined {
    return this._props.altura;
  }

  get chaveStorage(): string {
    return this._props.chaveStorage;
  }

  get svgConteudo(): string | null | undefined {
    return this._props.svgConteudo;
  }
}
