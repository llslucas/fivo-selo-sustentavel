import { InstituicaoRepository } from '@domain/fivo/application/ports/database/instituicao-repository';
import { Instituicao } from '@domain/fivo/entities/instituicao';

export class InMemoryInstituicaoRepository implements InstituicaoRepository {
  public items: Instituicao[] = [];

  findById(id: string): Promise<Instituicao | null> {
    const instituicao = this.items.find((item) => item.id.toString() === id);
    return Promise.resolve(instituicao ?? null);
  }

  findByCnpj(cnpj: string): Promise<Instituicao | null> {
    const instituicao = this.items.find((item) => item.cnpj.valor === cnpj);
    return Promise.resolve(instituicao ?? null);
  }

  create(instituicao: Instituicao): Promise<void> {
    this.items.push(instituicao);
    return Promise.resolve();
  }

  save(instituicao: Instituicao): Promise<void> {
    const index = this.items.findIndex((item) =>
      item.id.equals(instituicao.id),
    );

    if (index !== -1) {
      this.items[index] = instituicao;
    }

    return Promise.resolve();
  }
}
