export interface TokenSenha {
  id: string;
  usuarioId: string;
  token: string;
  criadoEm: Date;
  expiraEm: Date;
  usadoEm?: Date | null;
}

export abstract class TokenSenhaRepository {
  abstract findByToken(token: string): Promise<TokenSenha | null>;
  abstract create(tokenSenha: TokenSenha): Promise<void>;
  abstract save(tokenSenha: TokenSenha): Promise<void>;
  abstract deleteByUsuarioId(usuarioId: string): Promise<void>;
}
