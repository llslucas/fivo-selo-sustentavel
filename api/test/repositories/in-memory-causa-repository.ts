import { CausaRepository } from '@domain/fivo/application/ports/database/causa-repository';
import { Causa, CausaStatus } from '@domain/fivo/entities/causa';

function copiar(causa: Causa): Causa {
  return Causa.create(
    {
      nome: causa.nome,
      descricao: causa.descricao,
      status: causa.status,
      createdAt: causa.createdAt,
      updatedAt: causa.updatedAt,
    },
    causa.id,
  ).value as Causa;
}

export class InMemoryCausaRepository implements CausaRepository {
  public items: Causa[] = [];

  findById(id: string): Promise<Causa | null> {
    const causa = this.items.find((item) => item.id.toString() === id);
    return Promise.resolve(causa ? copiar(causa) : null);
  }

  findByNome(nome: string): Promise<Causa | null> {
    const normalizedName = nome.normalize('NFD');
    const causa = this.items.find((item) => item.nome === normalizedName);
    return Promise.resolve(causa ? copiar(causa) : null);
  }

  listarAtivas(): Promise<Causa[]> {
    const causas = this.items.filter(
      (item) => item.status === CausaStatus.ATIVA,
    );

    return Promise.resolve(causas.map((item) => copiar(item)));
  }

  create(causa: Causa): Promise<void> {
    this.items.push(copiar(causa));
    return Promise.resolve();
  }

  save(causa: Causa): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(causa.id));

    if (index !== -1) {
      this.items[index] = copiar(causa);
    }

    return Promise.resolve();
  }
}
