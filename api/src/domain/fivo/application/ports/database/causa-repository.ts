import { Causa } from '@domain/fivo/entities/causa';

export abstract class CausaRepository {
  abstract findById(id: string): Promise<Causa | null>;
  /** Compara o nome ignorando caixa e acento ("Educação" = "educacao"). */
  abstract findByNome(nome: string): Promise<Causa | null>;
  abstract listarAtivas(): Promise<Causa[]>;
  abstract create(causa: Causa): Promise<void>;
  abstract save(causa: Causa): Promise<void>;
}
