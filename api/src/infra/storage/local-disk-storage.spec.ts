import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StorageIndisponivelError } from '@domain/fivo/application/errors/storage-indisponivel-error';

import { LocalDiskStorage } from './local-disk-storage';

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
    const bloqueado = join(baseDir, 'bloqueado2');
    await writeFile(bloqueado, 'nao-e-diretorio');

    await expect(
      sut.remover('bloqueado2/sub/arquivo.png'),
    ).rejects.toBeInstanceOf(StorageIndisponivelError);
  });
});
