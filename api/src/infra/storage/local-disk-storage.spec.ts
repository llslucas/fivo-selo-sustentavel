import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageIndisponivelError } from '@domain/fivo/application/errors/storage-indisponivel-error';

import { LocalDiskStorage } from './local-disk-storage';

// `rm` mockado com o real como implementação padrão: permite forçar uma
// rejeição não-ENOENT em um teste sem depender de como cada SO reporta
// "caminho bloqueado por um arquivo" (ENOTDIR no Linux/Mac, mas ENOENT no
// Windows - que `force: true` do fs.rm ignora silenciosamente).
jest.mock('node:fs/promises', () => {
  const actual =
    jest.requireActual<typeof import('node:fs/promises')>('node:fs/promises');
  return { ...actual, rm: jest.fn(actual.rm) };
});

describe('LocalDiskStorage', () => {
  let baseDir: string;
  let sut: LocalDiskStorage;

  beforeEach(async () => {
    baseDir = await mkdtemp(join(tmpdir(), 'fivo-storage-'));
    sut = new LocalDiskStorage(baseDir);
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it('salvar -> ler roundtrip devolve os mesmos bytes', async () => {
    const chave = 'uuid-1/logo.png';
    const buffer = Buffer.from('conteudo-binario');

    await sut.salvar(chave, buffer);
    const lido = await sut.ler(chave);

    expect(lido.equals(buffer)).toBe(true);
  });

  it('remover apaga o arquivo salvo', async () => {
    const chave = 'uuid-2/logo.png';
    await sut.salvar(chave, Buffer.from('x'));

    await sut.remover(chave);

    await expect(sut.ler(chave)).rejects.toBeInstanceOf(
      StorageIndisponivelError,
    );
  });

  it('salvar propaga StorageIndisponivelError em falha de escrita', async () => {
    const bloqueado = join(baseDir, 'bloqueado');
    await writeFile(bloqueado, 'nao-e-diretorio');

    await expect(
      sut.salvar('bloqueado/sub/arquivo.png', Buffer.from('x')),
    ).rejects.toBeInstanceOf(StorageIndisponivelError);
  });

  it('ler propaga StorageIndisponivelError quando o arquivo nao existe', async () => {
    await expect(sut.ler('inexistente/arquivo.png')).rejects.toBeInstanceOf(
      StorageIndisponivelError,
    );
  });

  it('remover propaga StorageIndisponivelError em falha de I/O', async () => {
    (rm as jest.Mock).mockRejectedValueOnce(
      new Error('EACCES: permission denied'),
    );

    await expect(sut.remover('qualquer/arquivo.png')).rejects.toBeInstanceOf(
      StorageIndisponivelError,
    );
  });
});
