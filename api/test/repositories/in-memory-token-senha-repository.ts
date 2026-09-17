import {
  TokenSenha,
  TokenSenhaRepository,
} from '@domain/fivo/application/ports/token-senha-repository';

export class InMemoryTokenSenhaRepository implements TokenSenhaRepository {
  public items: TokenSenha[] = [];

  findByToken(token: string): Promise<TokenSenha | null> {
    const tokenSenha = this.items.find((item) => item.token === token) ?? null;
    return Promise.resolve(tokenSenha);
  }

  create(tokenSenha: TokenSenha): Promise<void> {
    this.items.push(tokenSenha);
    return Promise.resolve();
  }

  save(tokenSenha: TokenSenha): Promise<void> {
    const index = this.items.findIndex((item) => item.id === tokenSenha.id);

    if (index !== -1) {
      this.items[index] = tokenSenha;
    }

    return Promise.resolve();
  }

  deleteByUsuarioId(usuarioId: string): Promise<void> {
    this.items = this.items.filter((item) => item.usuarioId !== usuarioId);
    return Promise.resolve();
  }
}
