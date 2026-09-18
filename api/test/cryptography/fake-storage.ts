import { Storage } from '@domain/fivo/application/ports/storage';
import { StorageIndisponivelError } from '@domain/fivo/application/errors/storage-indisponivel-error';

export class FakeStorage implements Storage {
  public arquivos = new Map<string, { buffer: Buffer; mime: string }>();
  public shouldFail = false;
  public failOnChaves: string[] = [];

  forceFailure(): void {
    this.shouldFail = true;
  }

  resetFailure(): void {
    this.shouldFail = false;
    this.failOnChaves = [];
  }

  salvar(chave: string, buffer: Buffer, mime: string): Promise<void> {
    if (this.shouldFail || this.failOnChaves.includes(chave)) {
      throw new StorageIndisponivelError();
    }

    this.arquivos.set(chave, { buffer, mime });
    return Promise.resolve();
  }

  ler(chave: string): Promise<Buffer> {
    if (this.shouldFail || this.failOnChaves.includes(chave)) {
      throw new StorageIndisponivelError();
    }

    const arquivo = this.arquivos.get(chave);

    if (!arquivo) {
      throw new Error(`Arquivo não encontrado: ${chave}`);
    }

    return Promise.resolve(arquivo.buffer);
  }

  remover(chave: string): Promise<void> {
    if (this.shouldFail || this.failOnChaves.includes(chave)) {
      throw new StorageIndisponivelError();
    }

    this.arquivos.delete(chave);
    return Promise.resolve();
  }
}
