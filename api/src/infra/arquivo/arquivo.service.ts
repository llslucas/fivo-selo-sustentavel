import { randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { ArquivoInvalidoError } from '@domain/fivo/application/errors/arquivo-invalido-error';
import { Storage } from '@domain/fivo/application/ports/storage';
import { Arquivo, TipoArquivo } from '@domain/fivo/entities/arquivo';
import { Injectable } from '@nestjs/common';
import { imageSize } from 'image-size';

import { PrismaService } from '../database/prisma/prisma.service';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const TAMANHO_AMOSTRA_SVG = 2048;

export interface UploadImagemInput {
  tipo: TipoArquivo;
  nomeOriginal: string;
  buffer: Buffer;
}

export interface UploadImagemResultado {
  id: string;
}

export interface ArquivoBytes {
  buffer: Buffer;
  mime: string;
  nomeOriginal: string;
}

@Injectable()
export class ArquivoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: Storage,
  ) {}

  async uploadImagem(
    input: UploadImagemInput,
  ): Promise<Either<ArquivoInvalidoError, UploadImagemResultado>> {
    const mime = this.sniffarMime(input.buffer);
    const { largura, altura } = this.probarDimensao(mime, input.buffer);
    const svgConteudo =
      mime === 'image/svg+xml' ? input.buffer.toString('utf-8') : undefined;

    const arquivoOuErro = Arquivo.criar({
      tipo: input.tipo,
      nomeOriginal: input.nomeOriginal,
      mime,
      bytes: input.buffer.length,
      largura,
      altura,
      chaveStorage: this.gerarChaveStorage(input.nomeOriginal),
      svgConteudo,
    });

    if (arquivoOuErro.isLeft()) {
      return left(arquivoOuErro.value);
    }

    const arquivo = arquivoOuErro.value;

    await this.storage.salvar(arquivo.chaveStorage, input.buffer, arquivo.mime);

    await this.prisma.arquivo.create({
      data: {
        id: arquivo.id.toString(),
        tipo: arquivo.tipo,
        nomeOriginal: arquivo.nomeOriginal,
        mime: arquivo.mime,
        bytes: arquivo.bytes,
        largura: arquivo.largura ?? null,
        altura: arquivo.altura ?? null,
        chaveStorage: arquivo.chaveStorage,
        svgConteudo: arquivo.svgConteudo ?? null,
      },
    });

    return right({ id: arquivo.id.toString() });
  }

  async lerBytes(id: string): Promise<ArquivoBytes> {
    const registro = await this.prisma.arquivo.findUniqueOrThrow({
      where: { id },
    });
    const buffer = await this.storage.ler(registro.chaveStorage);

    return {
      buffer,
      mime: registro.mime,
      nomeOriginal: registro.nomeOriginal,
    };
  }

  async remover(id: string): Promise<void> {
    const registro = await this.prisma.arquivo.findUnique({ where: { id } });

    if (!registro) {
      return;
    }

    await this.prisma.arquivo.delete({ where: { id } });
    await this.storage.remover(registro.chaveStorage);
  }

  private sniffarMime(buffer: Buffer): string {
    if (buffer.subarray(0, PNG_MAGIC.length).equals(PNG_MAGIC)) {
      return 'image/png';
    }

    if (buffer.subarray(0, JPEG_MAGIC.length).equals(JPEG_MAGIC)) {
      return 'image/jpeg';
    }

    const amostra = buffer
      .subarray(0, Math.min(buffer.length, TAMANHO_AMOSTRA_SVG))
      .toString('utf-8');

    if (/<svg[\s>]/i.test(amostra)) {
      return 'image/svg+xml';
    }

    return 'application/octet-stream';
  }

  private probarDimensao(
    mime: string,
    buffer: Buffer,
  ): { largura?: number; altura?: number } {
    if (mime !== 'image/png' && mime !== 'image/jpeg') {
      return {};
    }

    try {
      const { width, height } = imageSize(buffer);
      return { largura: width, altura: height };
    } catch {
      return { largura: 0, altura: 0 };
    }
  }

  private gerarChaveStorage(nomeOriginal: string): string {
    return `${randomUUID()}/${this.slugificar(nomeOriginal)}`;
  }

  private slugificar(nome: string): string {
    const slug = nome
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return slug.length > 0 ? slug : 'arquivo';
  }
}
