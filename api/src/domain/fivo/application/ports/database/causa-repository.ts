import { Causa, CausaProps } from '@domain/fivo/entities/causa';

export abstract class CausaRepository {
  abstract findById(id: string): Promise<Causa | null>;
  abstract findByNome(nome: string): Promise<Causa | null>;
  abstract listarAtivas(): Promise<Causa[]>;
  abstract create(props: CausaProps): Promise<void>;
  abstract save(causa: Causa): Promise<void>;
}
