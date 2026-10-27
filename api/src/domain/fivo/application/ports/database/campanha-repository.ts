import { Campanha } from '@domain/fivo/entities/campanha';

export abstract class CampanhaRepository {
  abstract findById(id: string): Promise<Campanha | null>;

  abstract findByIdPublico(idPublico: string): Promise<Campanha | null>;

  abstract create(campanha: Campanha): Promise<void>;

  /**
   * Grava, numa só operação atômica, a campanha (incrementando `versao`), a
   * `campanha.alteracaoDecidida` e a `campanha.alteracaoPendente`.
   *
   * - `alteracaoDecidida`, quando houver, é a alteração que a campanha acabou
   *   de aprovar ou rejeitar. A linha dela (mesmo `id`) passa a guardar
   *   `status`, `decididoPor`, `decididoEm` e `motivo`. É gravada **antes** da
   *   pendente, para liberar a regra de "uma alteração em análise por vez"
   *   quando uma nova alteração é aberta na mesma instância.
   * - `alteracaoPendente`, quando houver, é inserida ou atualizada pelo `id`.
   *
   * As duas gravações são idempotentes pelo `id` da alteração: salvar de novo
   * a mesma instância não duplica histórico. Devolve `false` sem gravar nada
   * quando a versão guardada não é mais a `versaoEsperada` (outra operação
   * gravou antes).
   */
  abstract salvar(campanha: Campanha, versaoEsperada: number): Promise<boolean>;

  /** Campanhas `EM_ANALISE` e campanhas `APROVADA` com alteração pendente. */
  abstract listarEmAnalise(): Promise<Campanha[]>;
}
