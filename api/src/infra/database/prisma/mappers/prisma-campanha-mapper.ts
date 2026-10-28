import {
  AlteracaoCampanhaStatus as AlteracaoStatusPrisma,
  Campanha as CampanhaPrisma,
  CampanhaAlteracao as CampanhaAlteracaoPrisma,
  CampanhaStatus as CampanhaStatusPrisma,
  Prisma,
  TipoRegraDoacao as TipoRegraDoacaoPrisma,
} from '@prisma/client';

import { Either } from '@core/either';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import {
  AlteracaoCompromisso,
  AlteracaoStatus,
} from '@domain/fivo/entities/alteracao-compromisso';
import { Beneficiada } from '@domain/fivo/entities/beneficiada';
import { Campanha, CampanhaStatus } from '@domain/fivo/entities/campanha';
import { Compromisso } from '@domain/fivo/entities/compromisso';
import { DataCalendario } from '@domain/fivo/entities/data-calendario';
import { DescricaoCampanha } from '@domain/fivo/entities/descricao-campanha';
import { NomeCampanha } from '@domain/fivo/entities/nome-campanha';
import {
  RegraDoacao,
  TipoRegraDoacao,
} from '@domain/fivo/entities/regra-doacao';
import { ValorMonetario } from '@domain/fivo/entities/valor-monetario';
import { Vigencia } from '@domain/fivo/entities/vigencia';

export type CampanhaComAlteracoes = CampanhaPrisma & {
  alteracoes: CampanhaAlteracaoPrisma[];
};

const STATUS_PARA_PRISMA: Record<CampanhaStatus, CampanhaStatusPrisma> = {
  [CampanhaStatus.RASCUNHO]: CampanhaStatusPrisma.RASCUNHO,
  [CampanhaStatus.EM_ANALISE]: CampanhaStatusPrisma.EM_ANALISE,
  [CampanhaStatus.APROVADA]: CampanhaStatusPrisma.APROVADA,
  [CampanhaStatus.REJEITADA]: CampanhaStatusPrisma.REJEITADA,
};

const STATUS_PARA_DOMINIO: Record<CampanhaStatusPrisma, CampanhaStatus> = {
  [CampanhaStatusPrisma.RASCUNHO]: CampanhaStatus.RASCUNHO,
  [CampanhaStatusPrisma.EM_ANALISE]: CampanhaStatus.EM_ANALISE,
  [CampanhaStatusPrisma.APROVADA]: CampanhaStatus.APROVADA,
  [CampanhaStatusPrisma.REJEITADA]: CampanhaStatus.REJEITADA,
};

const ALTERACAO_PARA_PRISMA: Record<AlteracaoStatus, AlteracaoStatusPrisma> = {
  [AlteracaoStatus.EM_ANALISE]: AlteracaoStatusPrisma.EM_ANALISE,
  [AlteracaoStatus.APROVADA]: AlteracaoStatusPrisma.APROVADA,
  [AlteracaoStatus.REJEITADA]: AlteracaoStatusPrisma.REJEITADA,
};

const ALTERACAO_PARA_DOMINIO: Record<AlteracaoStatusPrisma, AlteracaoStatus> = {
  [AlteracaoStatusPrisma.EM_ANALISE]: AlteracaoStatus.EM_ANALISE,
  [AlteracaoStatusPrisma.APROVADA]: AlteracaoStatus.APROVADA,
  [AlteracaoStatusPrisma.REJEITADA]: AlteracaoStatus.REJEITADA,
};

const REGRA_PARA_PRISMA: Record<TipoRegraDoacao, TipoRegraDoacaoPrisma> = {
  [TipoRegraDoacao.POR_UNIDADE]: TipoRegraDoacaoPrisma.POR_UNIDADE,
  [TipoRegraDoacao.PERCENTUAL]: TipoRegraDoacaoPrisma.PERCENTUAL,
};

const REGRA_PARA_DOMINIO: Record<TipoRegraDoacaoPrisma, TipoRegraDoacao> = {
  [TipoRegraDoacaoPrisma.POR_UNIDADE]: TipoRegraDoacao.POR_UNIDADE,
  [TipoRegraDoacaoPrisma.PERCENTUAL]: TipoRegraDoacao.PERCENTUAL,
};

/** Lança quando o dado persistido não passa mais pela validação do domínio. */
function valorOuErro<T>(
  resultado: Either<Error, T>,
  campo: string,
  dono: string,
): T {
  if (resultado.isLeft()) {
    throw new Error(`${campo} inválido persistido para ${dono}`);
  }

  return resultado.value;
}

/** Inteiro em centésimos para o texto decimal que os VOs aceitam: 105 → "1.05". */
function paraDecimal(centesimos: number): string {
  const inteira = Math.floor(centesimos / 100);
  const fracao = String(centesimos % 100).padStart(2, '0');

  return `${inteira}.${fracao}`;
}

// `@db.Date` chega como meia-noite UTC: o dia é o prefixo ISO, sem fuso.
function dataParaTexto(data: Date): string {
  return data.toISOString().slice(0, 10);
}

function dataParaPrisma(data: DataCalendario): Date {
  return new Date(`${data.valor}T00:00:00.000Z`);
}

interface ColunasCompromisso {
  instituicaoId: string | null;
  causaId: string | null;
  regraTipo: TipoRegraDoacaoPrisma | null;
  regraValorCentavos: number | null;
  regraPercentualCentesimos: number | null;
  dataInicio: Date | null;
  dataFim: Date | null;
}

function beneficiadaDe(
  raw: ColunasCompromisso,
  dono: string,
): Beneficiada | null {
  if (raw.instituicaoId === null && raw.causaId === null) {
    return null;
  }

  return valorOuErro(
    Beneficiada.criar({
      instituicaoId: raw.instituicaoId ?? undefined,
      causaId: raw.causaId ?? undefined,
    }),
    'Beneficiada',
    dono,
  );
}

function regraDe(raw: ColunasCompromisso, dono: string): RegraDoacao | null {
  if (raw.regraTipo === null) {
    return null;
  }

  return valorOuErro(
    RegraDoacao.criar({
      tipo: REGRA_PARA_DOMINIO[raw.regraTipo],
      valor:
        raw.regraValorCentavos === null
          ? undefined
          : paraDecimal(raw.regraValorCentavos),
      percentual:
        raw.regraPercentualCentesimos === null
          ? undefined
          : paraDecimal(raw.regraPercentualCentesimos),
    }),
    'Regra de doação',
    dono,
  );
}

function vigenciaDe(raw: ColunasCompromisso, dono: string): Vigencia | null {
  if (raw.dataInicio === null) {
    if (raw.dataFim !== null) {
      throw new Error(`Vigência sem início persistida para ${dono}`);
    }

    return null;
  }

  const inicio = valorOuErro(
    DataCalendario.criar(dataParaTexto(raw.dataInicio)),
    'Data de início',
    dono,
  );
  const fim =
    raw.dataFim === null
      ? undefined
      : valorOuErro(
          DataCalendario.criar(dataParaTexto(raw.dataFim)),
          'Data de fim',
          dono,
        );

  return valorOuErro(Vigencia.criar({ inicio, fim }), 'Vigência', dono);
}

function colunasCompromisso(compromisso: {
  beneficiada?: Beneficiada | null;
  regraDoacao?: RegraDoacao | null;
  vigencia?: Vigencia | null;
}): ColunasCompromisso {
  const { beneficiada, regraDoacao, vigencia } = compromisso;

  return {
    instituicaoId: beneficiada?.tipo === 'INSTITUICAO' ? beneficiada.id : null,
    causaId: beneficiada?.tipo === 'CAUSA' ? beneficiada.id : null,
    regraTipo: regraDoacao ? REGRA_PARA_PRISMA[regraDoacao.tipo] : null,
    regraValorCentavos: regraDoacao?.valor?.centavos ?? null,
    regraPercentualCentesimos: regraDoacao?.percentual?.percentual ?? null,
    dataInicio: vigencia ? dataParaPrisma(vigencia.inicio) : null,
    dataFim: vigencia?.fim ? dataParaPrisma(vigencia.fim) : null,
  };
}

export class PrismaCampanhaMapper {
  static toDomain(raw: CampanhaComAlteracoes): Campanha {
    const dono = `a campanha ${raw.id}`;
    const id = new UniqueEntityId(raw.id);
    const beneficiada = beneficiadaDe(raw, dono);
    const regraDoacao = regraDe(raw, dono);
    const vigencia = vigenciaDe(raw, dono);

    // As alterações decididas ficam só como histórico na tabela; só a que
    // está em análise volta ao agregado.
    const pendente = raw.alteracoes.find(
      (alteracao) => alteracao.status === AlteracaoStatusPrisma.EM_ANALISE,
    );

    return Campanha.create(
      {
        empresaId: new UniqueEntityId(raw.empresaId),
        idPublico: new UniqueEntityId(raw.idPublico),
        nome: valorOuErro(NomeCampanha.criar(raw.nome), 'Nome', dono),
        descricao:
          raw.descricao === null
            ? null
            : valorOuErro(
                DescricaoCampanha.criar(raw.descricao),
                'Descrição',
                dono,
              ),
        capaArquivoId: raw.capaArquivoId
          ? new UniqueEntityId(raw.capaArquivoId)
          : null,
        beneficiada,
        regraDoacao,
        meta:
          raw.metaCentavos === null
            ? null
            : valorOuErro(
                ValorMonetario.deDecimal(paraDecimal(raw.metaCentavos)),
                'Meta',
                dono,
              ),
        vigencia,
        status: STATUS_PARA_DOMINIO[raw.status],
        submetidaEm: raw.submetidaEm,
        decididoPor: raw.decididoPor
          ? new UniqueEntityId(raw.decididoPor)
          : null,
        decididoEm: raw.decididoEm,
        motivoUltimaRejeicao: raw.motivoUltimaRejeicao,
        alteracaoPendente: pendente
          ? PrismaCampanhaMapper.alteracaoToDomain(pendente, id, {
              beneficiada,
              regraDoacao,
              vigencia,
            })
          : null,
        versao: raw.versao,
        createdAt: raw.criadoEm,
        updatedAt: raw.atualizadoEm,
      },
      id,
    );
  }

  static toPrisma(campanha: Campanha): Prisma.CampanhaUncheckedCreateInput {
    return {
      id: campanha.id.toString(),
      idPublico: campanha.idPublico.toString(),
      empresaId: campanha.empresaId.toString(),
      nome: campanha.nome.valor,
      descricao: campanha.descricao?.valor ?? null,
      capaArquivoId: campanha.capaArquivoId?.toString() ?? null,
      ...colunasCompromisso(campanha),
      metaCentavos: campanha.meta?.centavos ?? null,
      status: STATUS_PARA_PRISMA[campanha.status],
      submetidaEm: campanha.submetidaEm ?? null,
      decididoPor: campanha.decididoPor?.toString() ?? null,
      decididoEm: campanha.decididoEm ?? null,
      motivoUltimaRejeicao: campanha.motivoUltimaRejeicao ?? null,
      versao: campanha.versao,
      criadoEm: campanha.createdAt,
      atualizadoEm: campanha.updatedAt ?? null,
    };
  }

  static alteracaoToPrisma(
    alteracao: AlteracaoCompromisso,
  ): Prisma.CampanhaAlteracaoUncheckedCreateInput {
    const colunas = colunasCompromisso(alteracao.proposto);

    if (colunas.regraTipo === null || colunas.dataInicio === null) {
      throw new Error(
        `Alteração ${alteracao.id.toString()} sem compromisso completo`,
      );
    }

    return {
      id: alteracao.id.toString(),
      campanhaId: alteracao.campanhaId.toString(),
      ...colunas,
      regraTipo: colunas.regraTipo,
      dataInicio: colunas.dataInicio,
      status: ALTERACAO_PARA_PRISMA[alteracao.status],
      motivo: alteracao.motivo ?? null,
      decididoPor: alteracao.decididoPor?.toString() ?? null,
      decididoEm: alteracao.decididoEm ?? null,
      criadoEm: alteracao.createdAt,
    };
  }

  // O compromisso anterior não tem coluna: enquanto a alteração está em
  // análise, é o que está na campanha (design.md, Data Models).
  private static alteracaoToDomain(
    raw: CampanhaAlteracaoPrisma,
    campanhaId: UniqueEntityId,
    vigente: {
      beneficiada: Beneficiada | null;
      regraDoacao: RegraDoacao | null;
      vigencia: Vigencia | null;
    },
  ): AlteracaoCompromisso {
    const dono = `a alteração ${raw.id}`;
    const beneficiada = beneficiadaDe(raw, dono);
    const regraDoacao = regraDe(raw, dono);
    const vigencia = vigenciaDe(raw, dono);

    if (!beneficiada || !regraDoacao || !vigencia) {
      throw new Error(
        `Compromisso proposto incompleto persistido para ${dono}`,
      );
    }

    if (!vigente.beneficiada || !vigente.regraDoacao || !vigente.vigencia) {
      throw new Error(
        `Alteração pendente persistida para campanha sem compromisso: ${dono}`,
      );
    }

    return AlteracaoCompromisso.create(
      {
        campanhaId,
        proposto: Compromisso.criar({ beneficiada, regraDoacao, vigencia }),
        anterior: Compromisso.criar({
          beneficiada: vigente.beneficiada,
          regraDoacao: vigente.regraDoacao,
          vigencia: vigente.vigencia,
        }),
        status: ALTERACAO_PARA_DOMINIO[raw.status],
        createdAt: raw.criadoEm,
        decididoPor: raw.decididoPor
          ? new UniqueEntityId(raw.decididoPor)
          : null,
        decididoEm: raw.decididoEm,
        motivo: raw.motivo,
      },
      new UniqueEntityId(raw.id),
    );
  }
}
