import {
  Sessao,
  SessaoRepository,
} from '@domain/fivo/application/ports/sessao-repository';

export class InMemorySessaoRepository implements SessaoRepository {
  public items: Sessao[] = [];

  criar(sessao: Sessao): Promise<void> {
    this.items.push(sessao);
    return Promise.resolve();
  }

  buscarPorTokenHash(hash: string): Promise<Sessao | null> {
    const sessao = this.items.find((item) => item.tokenHash === hash) ?? null;
    return Promise.resolve(sessao);
  }

  deslizar(id: string, agora: Date): Promise<void> {
    const sessao = this.items.find((item) => item.id === id);

    if (sessao) {
      sessao.ultimoAcessoEm = agora;
    }

    return Promise.resolve();
  }

  revogar(id: string): Promise<void> {
    const sessao = this.items.find((item) => item.id === id);

    if (sessao) {
      sessao.revogadaEm = new Date();
    }

    return Promise.resolve();
  }

  revogarTodasDoUsuario(usuarioId: string): Promise<void> {
    const agora = new Date();

    this.items
      .filter((item) => item.usuarioId === usuarioId)
      .forEach((item) => {
        item.revogadaEm = agora;
      });

    return Promise.resolve();
  }
}
