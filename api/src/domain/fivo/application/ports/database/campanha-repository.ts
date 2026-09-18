import { Campanha } from '@domain/fivo/entities/campanha';

export abstract class CampanhaRepository {
  abstract findById(id: string): Promise<Campanha | null>;
  abstract findByIdPublico(id_publico: string): Promise<Campanha | null>;
  abstract create(campanha: Campanha): Promise<void>;
  abstract save(campanha: Campanha): Promise<void>;
}
