import { Campanha } from '@domain/fivo/entities/campanha';

export abstract class CampanhaRepository {
  abstract findById(id: string): Promise<Campanha | null>;

  abstract findByIdPublico(idPublico: string): Promise<Campanha | null>;

  abstract create(campanha: Campanha): Promise<void>;

  /**
   * Grava a campanha e a alteração pendente juntas e incrementa `versao`.
   * Devolve `false` sem gravar nada quando a versão guardada não é mais a
   * `versaoEsperada` (outra operação gravou antes).
   */
  abstract salvar(campanha: Campanha, versaoEsperada: number): Promise<boolean>;

  /** Campanhas `EM_ANALISE` e campanhas `APROVADA` com alteração pendente. */
  abstract listarEmAnalise(): Promise<Campanha[]>;
}
