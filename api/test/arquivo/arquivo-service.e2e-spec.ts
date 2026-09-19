import { writeFile } from 'node:fs/promises';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { ArquivoInvalidoError } from '@domain/fivo/application/errors/arquivo-invalido-error';
import { StorageIndisponivelError } from '@domain/fivo/application/errors/storage-indisponivel-error';
import { TipoArquivo } from '@domain/fivo/entities/arquivo';
import { ArquivoService } from '@infra/arquivo/arquivo.service';
import { LocalDiskStorage } from '@infra/storage/local-disk-storage';
import {
  AppDeTeste,
  criarAppDeTeste,
  limparBanco,
} from '@test/helpers/e2e-app';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

function pngBuffer(largura: number, altura: number): Buffer {
  const png = new PNG({ width: largura, height: altura });
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 200;
    png.data[i + 1] = 0;
    png.data[i + 2] = 0;
    png.data[i + 3] = 255;
  }
  return PNG.sync.write(png);
}

function jpegBuffer(largura: number, altura: number): Buffer {
  const dados = Buffer.alloc(largura * altura * 4);
  for (let i = 0; i < dados.length; i += 4) {
    dados[i] = 0;
    dados[i + 1] = 200;
    dados[i + 2] = 0;
    dados[i + 3] = 255;
  }
  return jpeg.encode({ data: dados, width: largura, height: altura }, 80).data;
}

const SVG_VALIDO =
  '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>';
const SVG_COM_SCRIPT =
  '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';

describe('ArquivoService (e2e)', () => {
  let contexto: AppDeTeste;
  let baseDir: string;
  let service: ArquivoService;

  beforeAll(async () => {
    contexto = await criarAppDeTeste();
  });

  beforeEach(async () => {
    await limparBanco(contexto.prisma);
    baseDir = await mkdtemp(join(tmpdir(), 'fivo-arquivo-service-'));
    service = new ArquivoService(
      contexto.prisma,
      new LocalDiskStorage(baseDir),
    );
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  afterAll(async () => {
    await contexto.encerrar();
  });

  it('aceita PNG válido (>=512x512) e persiste a linha + o objeto no storage', async () => {
    const buffer = pngBuffer(512, 512);

    const resultado = await service.uploadImagem({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo.png',
      buffer,
    });

    expect(resultado.isRight()).toBe(true);
    if (resultado.isLeft()) throw new Error('esperava Right');

    const linha = await contexto.prisma.arquivo.findUnique({
      where: { id: resultado.value.id },
    });
    expect(linha?.mime).toBe('image/png');
    expect(linha?.largura).toBe(512);
    expect(linha?.altura).toBe(512);

    const lido = await service.lerBytes(resultado.value.id);
    expect(lido.buffer.equals(buffer)).toBe(true);
  });

  it('aceita JPG válido (>=512x512) e persiste a linha + o objeto no storage', async () => {
    const buffer = jpegBuffer(600, 512);

    const resultado = await service.uploadImagem({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo.jpg',
      buffer,
    });

    expect(resultado.isRight()).toBe(true);
    if (resultado.isLeft()) throw new Error('esperava Right');

    const linha = await contexto.prisma.arquivo.findUnique({
      where: { id: resultado.value.id },
    });
    expect(linha?.mime).toBe('image/jpeg');
    expect(linha?.largura).toBe(600);
    expect(linha?.altura).toBe(512);
  });

  it('aceita SVG válido e persiste svgConteudo', async () => {
    const buffer = Buffer.from(SVG_VALIDO, 'utf-8');

    const resultado = await service.uploadImagem({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo.svg',
      buffer,
    });

    expect(resultado.isRight()).toBe(true);
    if (resultado.isLeft()) throw new Error('esperava Right');

    const linha = await contexto.prisma.arquivo.findUnique({
      where: { id: resultado.value.id },
    });
    expect(linha?.mime).toBe('image/svg+xml');
    expect(linha?.svgConteudo).toBe(SVG_VALIDO);
  });

  it('rejeita arquivo cujos magic bytes não batem com nenhum formato aceito (422)', async () => {
    const buffer = Buffer.concat([
      Buffer.from('GIF89a', 'utf-8'),
      Buffer.alloc(100),
    ]);

    const resultado = await service.uploadImagem({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'arquivo.gif',
      buffer,
    });

    expect(resultado.isLeft()).toBe(true);
    if (!resultado.isLeft()) throw new Error('esperava Left');
    expect(resultado.value).toBeInstanceOf(ArquivoInvalidoError);
    expect(resultado.value.status).toBe(422);

    expect(await contexto.prisma.arquivo.count()).toBe(0);
  });

  it('rejeita PNG maior que 5 MB (422)', async () => {
    const buffer = Buffer.concat([
      pngBuffer(512, 512),
      Buffer.alloc(6 * 1024 * 1024),
    ]);

    const resultado = await service.uploadImagem({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo-grande.png',
      buffer,
    });

    expect(resultado.isLeft()).toBe(true);
    if (!resultado.isLeft()) throw new Error('esperava Left');
    expect(resultado.value.message).toMatch(/5 MB/);
  });

  it('rejeita raster com dimensão menor que 512x512 (422)', async () => {
    const buffer = pngBuffer(100, 100);

    const resultado = await service.uploadImagem({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo-pequeno.png',
      buffer,
    });

    expect(resultado.isLeft()).toBe(true);
    if (!resultado.isLeft()) throw new Error('esperava Left');
    expect(resultado.value.message).toMatch(/512x512/);
  });

  it('rejeita SVG com <script> (422)', async () => {
    const buffer = Buffer.from(SVG_COM_SCRIPT, 'utf-8');

    const resultado = await service.uploadImagem({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo-malicioso.svg',
      buffer,
    });

    expect(resultado.isLeft()).toBe(true);
    if (!resultado.isLeft()) throw new Error('esperava Left');
    expect(resultado.value.message).toMatch(/script/);
  });

  it('propaga StorageIndisponivelError em falha de storage, sem linha arquivo órfã', async () => {
    const arquivoNoLugarDoDiretorio = join(baseDir, 'bloqueado');
    await writeFile(arquivoNoLugarDoDiretorio, 'nao-e-diretorio');
    const storageQuebrado = new LocalDiskStorage(arquivoNoLugarDoDiretorio);
    const serviceComStorageQuebrado = new ArquivoService(
      contexto.prisma,
      storageQuebrado,
    );

    await expect(
      serviceComStorageQuebrado.uploadImagem({
        tipo: TipoArquivo.LOGO_EMPRESA,
        nomeOriginal: 'logo.png',
        buffer: pngBuffer(512, 512),
      }),
    ).rejects.toBeInstanceOf(StorageIndisponivelError);

    expect(await contexto.prisma.arquivo.count()).toBe(0);
  });

  it('lerBytes devolve os bytes e o mime do registro', async () => {
    const buffer = jpegBuffer(512, 512);
    const resultado = await service.uploadImagem({
      tipo: TipoArquivo.LOGO_EMPRESA,
      nomeOriginal: 'logo.jpg',
      buffer,
    });
    if (resultado.isLeft()) throw new Error('esperava Right');

    const lido = await service.lerBytes(resultado.value.id);

    expect(lido.mime).toBe('image/jpeg');
    expect(lido.nomeOriginal).toBe('logo.jpg');
    expect(lido.buffer.equals(buffer)).toBe(true);
  });
});
