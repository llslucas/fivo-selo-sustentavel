import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { StorageIndisponivelError } from '@domain/fivo/application/errors/storage-indisponivel-error';
import { Storage } from '@domain/fivo/application/ports/storage';
import { Injectable } from '@nestjs/common';

@Injectable()
export class LocalDiskStorage implements Storage {
  constructor(private readonly baseDir: string) {}

  async salvar(chave: string, buffer: Buffer): Promise<void> {
    const caminho = join(this.baseDir, chave);

    try {
      await mkdir(dirname(caminho), { recursive: true });
      await writeFile(caminho, buffer);
    } catch {
      throw new StorageIndisponivelError();
    }
  }

  async ler(chave: string): Promise<Buffer> {
    const caminho = join(this.baseDir, chave);

    try {
      return await readFile(caminho);
    } catch {
      throw new StorageIndisponivelError();
    }
  }

  async remover(chave: string): Promise<void> {
    const caminho = join(this.baseDir, chave);

    try {
      await rm(caminho, { force: true });
    } catch {
      throw new StorageIndisponivelError();
    }
  }
}
