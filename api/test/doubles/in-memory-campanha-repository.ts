import { CampanhaRepository } from '@domain/fivo/campanhas/ports/campanha-repository';
import { AlteracaoCompromisso } from '@domain/fivo/campanhas/entities/alteracao-compromisso';
import {
  Campanha,
  CampanhaStatus,
} from '@domain/fivo/campanhas/entities/campanha';

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
    },
    campanha.id,
  );
}

export class InMemoryCampanhaRepository implements CampanhaRepository {
  public items: Campanha[] = [];
  /** Histórico das alterações decididas gravadas pelo `salvar`. */
  public alteracoesDecididas: AlteracaoCompromisso[] = [];

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
