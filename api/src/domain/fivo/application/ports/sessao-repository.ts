export interface Sessao {
  id: string;
  usuarioId: string;
  token: string;
  criadoEm: Date;
  expiraEm: Date;
  revogadoEm?: Date | null;
}

export abstract class SessaoRepository {
  abstract findByToken(token: string): Promise<Sessao | null>;
  abstract create(sessao: Sessao): Promise<void>;
  abstract save(sessao: Sessao): Promise<void>;
  abstract deleteByUsuarioId(usuarioId: string): Promise<void>;
}
