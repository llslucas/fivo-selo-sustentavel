import {
  TokenSenha,
  TokenSenhaRepository,
} from '@domain/fivo/application/ports/token-senha-repository';

export class InMemoryTokenSenhaRepository implements TokenSenhaRepository {
  public items: TokenSenha[] = [];

  criar(tokenSenha: TokenSenha): Promise<void> {
    this.items.push(tokenSenha);
    return Promise.resolve();
  }

  buscarPorHash(hash: string): Promise<TokenSenha | null> {
    const tokenSenha =
      this.items.find((item) => item.tokenHash === hash) ?? null;
    return Promise.resolve(tokenSenha);
  }

  marcarUsado(id: string): Promise<void> {
    const tokenSenha = this.items.find((item) => item.id === id);

    if (tokenSenha) {
      tokenSenha.usadoEm = new Date();
    }

    return Promise.resolve();
  }
}
