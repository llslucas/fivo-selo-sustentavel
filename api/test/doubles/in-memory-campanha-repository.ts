import { CampanhaRepository } from '@domain/fivo/campanhas/ports/campanha-repository';
import { AlteracaoCompromisso } from '@domain/fivo/campanhas/entities/alteracao-compromisso';
import {
  Campanha,
  CampanhaStatus,
} from '@domain/fivo/campanhas/entities/campanha';
import { SlugEmUsoError } from '@domain/fivo/shared';

function copiarAlteracao(
  alteracao: AlteracaoCompromisso | null | undefined,
): AlteracaoCompromisso | null {
  if (!alteracao) {
    return null;
  }

  return AlteracaoCompromisso.create(
    {
      campanhaId: alteracao.campanhaId,
      proposto: alteracao.proposto,
      anterior: alteracao.anterior,
      status: alteracao.status,
      createdAt: alteracao.createdAt,
      decididoPor: alteracao.decididoPor,
      decididoEm: alteracao.decididoEm,
      motivo: alteracao.motivo,
    },
    alteracao.id,
  );
}

// Os value objects são imutáveis e podem ser compartilhados; a campanha e a
// alteração pendente, não.
function copiar(
  campanha: Campanha,
  versao: number = campanha.versao,
): Campanha {
  return Campanha.create(
    {
      empresaId: campanha.empresaId,
      idPublico: campanha.idPublico,
      nome: campanha.nome,
      descricao: campanha.descricao,
      capaArquivoId: campanha.capaArquivoId,
      beneficiada: campanha.beneficiada,
      regraDoacao: campanha.regraDoacao,
      meta: campanha.meta,
      vigencia: campanha.vigencia,
      status: campanha.status,
      submetidaEm: campanha.submetidaEm,
      decididoPor: campanha.decididoPor,
      decididoEm: campanha.decididoEm,
      motivoUltimaRejeicao: campanha.motivoUltimaRejeicao,
      alteracaoPendente: copiarAlteracao(campanha.alteracaoPendente),
      versao,
      createdAt: campanha.createdAt,
      updatedAt: campanha.updatedAt,
      slug: campanha.slug,
    },
    campanha.id,
  );
}

export class InMemoryCampanhaRepository implements CampanhaRepository {
  public items: Campanha[] = [];
  /** Histórico das alterações decididas gravadas pelo `salvar`. */
  public alteracoesDecididas: AlteracaoCompromisso[] = [];
  private conflitoDeSlugForcado = false;

  /**
   * Simula a corrida de aprovações: o próximo `salvar` com slug encontra outra
   * campanha da mesma empresa já dona desse slug e lança `SlugEmUsoError`. Só
   * vale uma vez, e a rival fica guardada, então `listarPorEmpresa` já mostra
   * o slug ocupado na tentativa seguinte.
   */
  forcarConflitoDeSlugNoProximoSalvar(): void {
    this.conflitoDeSlugForcado = true;
  }

  findById(id: string): Promise<Campanha | null> {
    const campanha = this.items.find((item) => item.id.toString() === id);
    return Promise.resolve(campanha ? copiar(campanha) : null);
  }

  findByIdPublico(idPublico: string): Promise<Campanha | null> {
    const campanha = this.items.find(
      (item) => item.idPublico.toString() === idPublico,
    );
    return Promise.resolve(campanha ? copiar(campanha) : null);
  }

  create(campanha: Campanha): Promise<void> {
    this.items.push(copiar(campanha));
    return Promise.resolve();
  }

  salvar(campanha: Campanha, versaoEsperada: number): Promise<boolean> {
    const index = this.items.findIndex((item) => item.id.equals(campanha.id));

    if (index === -1 || this.items[index].versao !== versaoEsperada) {
      return Promise.resolve(false);
    }

    if (campanha.slug && this.conflitoDeSlugForcado) {
      this.conflitoDeSlugForcado = false;
      this.items.push(
        Campanha.create({
          empresaId: campanha.empresaId,
          nome: campanha.nome,
          status: campanha.status,
          slug: campanha.slug,
        }),
      );
      return Promise.reject(new SlugEmUsoError());
    }

    // Espelha o índice único `(empresaId, slug)` do adaptador Prisma: o mesmo
    // slug em empresas diferentes é permitido.
    const slugEmUso = this.items.some(
      (item) =>
        !item.id.equals(campanha.id) &&
        item.empresaId.equals(campanha.empresaId) &&
        !!campanha.slug &&
        item.slug?.valor === campanha.slug.valor,
    );

    if (slugEmUso) {
      return Promise.reject(new SlugEmUsoError());
    }

    this.items[index] = copiar(campanha, versaoEsperada + 1);
    this.gravarAlteracaoDecidida(campanha.alteracaoDecidida);
    return Promise.resolve(true);
  }

  listarEmAnalise(): Promise<Campanha[]> {
    const emAnalise = this.items.filter(
      (item) =>
        item.status === CampanhaStatus.EM_ANALISE ||
        (item.status === CampanhaStatus.APROVADA && !!item.alteracaoPendente),
    );

    return Promise.resolve(emAnalise.map((item) => copiar(item)));
  }

  listarPorEmpresa(empresaId: string): Promise<Campanha[]> {
    const daEmpresa = this.items
      .filter((item) => item.empresaId.toString() === empresaId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return Promise.resolve(daEmpresa.map((item) => copiar(item)));
  }

  private gravarAlteracaoDecidida(
    alteracao: AlteracaoCompromisso | null,
  ): void {
    const copia = copiarAlteracao(alteracao);

    if (!copia) {
      return;
    }

    const index = this.alteracoesDecididas.findIndex((item) =>
      item.id.equals(copia.id),
    );

    if (index === -1) {
      this.alteracoesDecididas.push(copia);
    } else {
      this.alteracoesDecididas[index] = copia;
    }
  }
}
