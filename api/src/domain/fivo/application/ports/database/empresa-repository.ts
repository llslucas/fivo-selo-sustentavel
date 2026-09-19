import { Empresa } from '@domain/fivo/entities/empresa';

export type OrdenacaoListaEmpresa = 'asc' | 'desc';

export abstract class EmpresaRepository {
  abstract findById(id: string): Promise<Empresa | null>;
  abstract findByCnpj(cnpj: string): Promise<Empresa | null>;
  abstract findByUsuarioId(usuarioId: string): Promise<Empresa | null>;
  abstract findByTokenTrocaEmailHash(hash: string): Promise<Empresa | null>;
  abstract listarPorEstado(
    estado: string,
    ordem: OrdenacaoListaEmpresa,
  ): Promise<Empresa[]>;
  abstract create(empresa: Empresa): Promise<void>;
  abstract save(empresa: Empresa): Promise<void>;
}
