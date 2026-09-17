export interface UploadFileInput {
  chave: string;
  conteudo: Buffer | string;
  mimeType?: string;
}

export abstract class Storage {
  abstract upload(input: UploadFileInput): Promise<string>;
  abstract delete(chave: string): Promise<void>;
}
