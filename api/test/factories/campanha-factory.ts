import { Either } from '@core/either';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import {
  AlteracaoCompromisso,
  AlteracaoCompromissoProps,
} from '@domain/fivo/entities/alteracao-compromisso';
import { Beneficiada } from '@domain/fivo/entities/beneficiada';
import {
  Campanha,
  CampanhaProps,
  CampanhaStatus,
} from '@domain/fivo/entities/campanha';
import { Compromisso } from '@domain/fivo/entities/compromisso';
import { DataCalendario } from '@domain/fivo/entities/data-calendario';
import { DescricaoCampanha } from '@domain/fivo/entities/descricao-campanha';
import { NomeCampanha } from '@domain/fivo/entities/nome-campanha';
import {
  RegraDoacao,
  TipoRegraDoacao,
} from '@domain/fivo/entities/regra-doacao';
import { Vigencia } from '@domain/fivo/entities/vigencia';

function valor<T>(resultado: Either<Error, T>): T {
  if (resultado.isLeft()) {
    throw resultado.value;
  }

  return resultado.value;
}

// Campos que a submissão exige; vigência sem fim para a campanha não vencer
// com o passar do tempo.
function camposCompletos(): Partial<CampanhaProps> {
  return {
    descricao: valor(
      DescricaoCampanha.criar('Cada produto vendido ajuda uma instituicao.'),
    ),
    beneficiada: valor(
      Beneficiada.criar({ instituicaoId: new UniqueEntityId().toString() }),
    ),
    regraDoacao: valor(
      RegraDoacao.criar({ tipo: TipoRegraDoacao.POR_UNIDADE, valor: '1.00' }),
    ),
    vigencia: valor(
      Vigencia.criar({ inicio: valor(DataCalendario.criar('2026-10-01')) }),
    ),
  };
}

export class CampanhaFactory {
  /** Rascunho só com o nome, a menos que `props` diga outra coisa. */
  static create(
    props: Partial<CampanhaProps> = {},
    id?: UniqueEntityId,
  ): Campanha {
    const campanha = Campanha.create(
      {
        empresaId: new UniqueEntityId(),
        nome: valor(NomeCampanha.criar('Campanha Teste')),
        ...props,
      },
      id,
    );

    return campanha;
  }

  /** Rascunho com todos os campos que a submissão exige. */
  static completa(
    props: Partial<CampanhaProps> = {},
    id?: UniqueEntityId,
  ): Campanha {
    return CampanhaFactory.create({ ...camposCompletos(), ...props }, id);
  }

  static emAnalise(
    props: Partial<CampanhaProps> = {},
    id?: UniqueEntityId,
  ): Campanha {
    return CampanhaFactory.completa(
      {
        status: CampanhaStatus.EM_ANALISE,
        submetidaEm: new Date(),
        ...props,
      },
      id,
    );
  }

  static aprovada(
    props: Partial<CampanhaProps> = {},
    id?: UniqueEntityId,
  ): Campanha {
    return CampanhaFactory.completa(
      {
        status: CampanhaStatus.APROVADA,
        submetidaEm: new Date(),
        decididoPor: new UniqueEntityId(),
        decididoEm: new Date(),
        ...props,
      },
      id,
    );
  }

  /**
   * Campanha aprovada com uma alteração em análise. Sem `proposto`, a
   * alteração troca a regra de doação por 10% do valor.
   */
  static aprovadaComAlteracao(
    props: Partial<CampanhaProps> = {},
    alteracao: Partial<
      Pick<AlteracaoCompromissoProps, 'proposto' | 'createdAt'>
    > = {},
    id: UniqueEntityId = new UniqueEntityId(),
  ): Campanha {
    const campos = { ...camposCompletos(), ...props };

    if (!campos.beneficiada || !campos.regraDoacao || !campos.vigencia) {
      throw new Error('Campanha aprovada sem compromisso completo');
    }

    const anterior = Compromisso.criar({
      beneficiada: campos.beneficiada,
      regraDoacao: campos.regraDoacao,
      vigencia: campos.vigencia,
    });

    const proposto =
      alteracao.proposto ??
      anterior.mesclar({
        regraDoacao: valor(
          RegraDoacao.criar({
            tipo: TipoRegraDoacao.PERCENTUAL,
            percentual: '10',
          }),
        ),
      });

    return CampanhaFactory.aprovada(
      {
        ...campos,
        alteracaoPendente: AlteracaoCompromisso.create({
          campanhaId: id,
          anterior,
          proposto,
          createdAt: alteracao.createdAt,
        }),
      },
      id,
    );
  }
}
