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
  /**
   * Grava só os dados cadastrais. Não altera `status`, `decididoPor`,
   * `decididoEm` nem `motivoDecisao`: mudança de estado é sempre por
   * `salvarTransicao`, senão uma leitura obsoleta desfaz a decisão do admin.
   */
  abstract save(empresa: Empresa): Promise<void>;
  /** Grava a transição só se o estado persistido ainda for `estadoEsperado`; `false` se outra decisão venceu. */
  abstract salvarTransicao(
    empresa: Empresa,
    estadoEsperado: string,
  ): Promise<boolean>;
}
