export interface TokenSenha {
  id: string;
  usuarioId: string;
  tokenHash: string;
  criadoEm: Date;
  expiraEm: Date;
  usadoEm?: Date | null;
}

export abstract class TokenSenhaRepository {
  abstract criar(tokenSenha: TokenSenha): Promise<void>;
  abstract buscarPorHash(hash: string): Promise<TokenSenha | null>;
  abstract marcarUsado(id: string): Promise<void>;
}
