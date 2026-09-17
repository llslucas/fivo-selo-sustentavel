import {
  Sessao,
  SessaoRepository,
} from '@domain/fivo/application/ports/sessao-repository';

export class InMemorySessaoRepository implements SessaoRepository {
  public items: Sessao[] = [];

  findByToken(token: string): Promise<Sessao | null> {
    const sessao = this.items.find((item) => item.token === token) ?? null;
    return Promise.resolve(sessao);
  }

  create(sessao: Sessao): Promise<void> {
    this.items.push(sessao);
    return Promise.resolve();
  }

  save(sessao: Sessao): Promise<void> {
    const index = this.items.findIndex((item) => item.id === sessao.id);

    if (index !== -1) {
      this.items[index] = sessao;
    }

    return Promise.resolve();
  }

  deleteByUsuarioId(usuarioId: string): Promise<void> {
    this.items = this.items.filter((item) => item.usuarioId !== usuarioId);
    return Promise.resolve();
  }
}
