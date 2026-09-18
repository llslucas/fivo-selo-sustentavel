export abstract class Storage {
  abstract salvar(chave: string, buffer: Buffer, mime: string): Promise<void>;
  abstract ler(chave: string): Promise<Buffer>;
  abstract remover(chave: string): Promise<void>;
}
