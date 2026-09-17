import {
  Storage,
  UploadFileInput,
} from '@domain/fivo/application/ports/storage';
import { StorageIndisponivelError } from '@domain/fivo/application/errors/storage-indisponivel-error';

export class FakeStorage implements Storage {
  public uploaded: Array<{
    chave: string;
    conteudo: string;
    mimeType?: string;
  }> = [];
  public deleted: string[] = [];
  public shouldFail = false;
  public failOnChaves: string[] = [];

  forceFailure(): void {
    this.shouldFail = true;
  }

  resetFailure(): void {
    this.shouldFail = false;
    this.failOnChaves = [];
  }

  upload(input: UploadFileInput): Promise<string> {
    if (this.shouldFail || this.failOnChaves.includes(input.chave)) {
      throw new StorageIndisponivelError();
    }

    const conteudo =
      typeof input.conteudo === 'string'
        ? input.conteudo
        : input.conteudo.toString('utf-8');

    this.uploaded.push({
      chave: input.chave,
      conteudo,
      mimeType: input.mimeType,
    });

    return Promise.resolve(input.chave);
  }

  delete(chave: string): Promise<void> {
    if (this.shouldFail) {
      throw new StorageIndisponivelError();
    }

    this.deleted.push(chave);
    return Promise.resolve();
  }
}
