import { Empresa } from '@domain/fivo/entities/empresa';

export abstract class EmpresaRepository {
  abstract findById(id: string): Promise<Empresa | null>;
  abstract findByCnpj(cnpj: string): Promise<Empresa | null>;
  abstract create(empresa: Empresa): Promise<void>;
  abstract save(empresa: Empresa): Promise<void>;
}
