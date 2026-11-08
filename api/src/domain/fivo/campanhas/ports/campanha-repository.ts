import { Campanha } from '../entities/campanha';

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
   *
   * Grava também o `slug`. O par `(empresaId, slug)` é único: se outra
   * campanha da mesma empresa já tem o slug, lança `SlugEmUsoError` sem gravar
   * nada (a versão não é incrementada). Campanhas de empresas diferentes podem
   * ter o mesmo slug.
   */
  abstract salvar(campanha: Campanha, versaoEsperada: number): Promise<boolean>;

  /** Campanhas `EM_ANALISE` e campanhas `APROVADA` com alteração pendente. */
  abstract listarEmAnalise(): Promise<Campanha[]>;

  /** Todas as campanhas da empresa, da mais recente para a mais antiga (`createdAt` desc). */
  abstract listarPorEmpresa(empresaId: string): Promise<Campanha[]>;
}
