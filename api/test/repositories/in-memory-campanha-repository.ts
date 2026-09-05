import { CampanhaRepository } from '@domain/fivo/application/ports/database/campanha-repository';
import { Campanha } from '@domain/fivo/entities/campanha';

export class InMemoryCampanhaRepository implements CampanhaRepository {
  items: Campanha[] = [];

  findById(id: string): Promise<Campanha | null> {
    return Promise.resolve(
      this.items.find((item) => item.id.toString() === id) || null,
    );
  }

  findByIdPublico(id_publico: string): Promise<Campanha | null> {
    return Promise.resolve(
      this.items.find((item) => item.id_publico.toString() === id_publico) ||
        null,
    );
  }

  create(campanha: Campanha): Promise<void> {
    this.items.push(campanha);
    return Promise.resolve();
  }

  save(campanha: Campanha): Promise<void> {
    const index = this.items.findIndex(
      (item) => item.id.toString() === campanha.id.toString(),
    );

    if (index !== -1) {
      this.items[index] = campanha;
    }

    return Promise.resolve();
  }
}
