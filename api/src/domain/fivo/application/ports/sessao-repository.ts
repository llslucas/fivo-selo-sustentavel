export interface Sessao {
  id: string;
  usuarioId: string;
  tokenHash: string;
  criadaEm: Date;
  ultimoAcessoEm: Date;
  revogadaEm?: Date | null;
  ip?: string;
  userAgent?: string;
}

export abstract class SessaoRepository {
  abstract criar(sessao: Sessao): Promise<void>;
  abstract buscarPorTokenHash(hash: string): Promise<Sessao | null>;
  abstract deslizar(id: string, agora: Date): Promise<void>;
  abstract revogar(id: string): Promise<void>;
  abstract revogarTodasDoUsuario(usuarioId: string): Promise<void>;
}
