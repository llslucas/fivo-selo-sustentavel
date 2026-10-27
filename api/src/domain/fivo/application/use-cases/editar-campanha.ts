import { randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { Beneficiada } from '@domain/fivo/entities/beneficiada';
import { CampanhaStatus } from '@domain/fivo/entities/campanha';
import { DataCalendario } from '@domain/fivo/entities/data-calendario';
import { DescricaoCampanha } from '@domain/fivo/entities/descricao-campanha';
import { NomeCampanha } from '@domain/fivo/entities/nome-campanha';
import {
  RegraDoacao,
  TipoRegraDoacao,
} from '@domain/fivo/entities/regra-doacao';
import { ValorMonetario } from '@domain/fivo/entities/valor-monetario';
import { Vigencia } from '@domain/fivo/entities/vigencia';
import { Injectable } from '@nestjs/common';
import { AlteracaoJaPendenteError } from '../errors/alteracao-ja-pendente.error';
import { BeneficiadaAmbiguaError } from '../errors/beneficiada-ambigua.error';
import { BeneficiadaIndisponivelError } from '../errors/beneficiada-indisponivel.error';
import { CampanhaEmAnaliseError } from '../errors/campanha-em-analise.error';
import { DataInvalidaError } from '../errors/data-invalida.error';
import { DescricaoCampanhaInvalidaError } from '../errors/descricao-campanha-invalida.error';
import { InvalidRuleValueError } from '../errors/invalid-rule-value.error';
import { NomeCampanhaInvalidoError } from '../errors/nome-campanha-invalido.error';
import { PercentualInvalidoError } from '../errors/percentual-invalido.error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { ValorMonetarioInvalidoError } from '../errors/valor-monetario-invalido.error';
import { VigenciaInvalidaError } from '../errors/vigencia-invalida.error';
import { CampanhaRepository } from '../ports/database/campanha-repository';
import { RegistroAuditoriaRepository } from '../ports/registro-auditoria-repository';
import { AssegurarBeneficiadaDisponivelUseCase } from './assegurar-beneficiada-disponivel';
import { AssegurarEmpresaAprovadaUseCase } from './assegurar-empresa-aprovada';
import {
  CampanhaDetalhe,
  descreverCompromisso,
  montarCampanhaDetalhe,
} from './campanha-detalhe';

export interface EditarCampanhaUseCaseRegraDoacao {
  tipo: TipoRegraDoacao;
  valor?: string;
  percentual?: string;
}

export interface EditarCampanhaUseCaseVigencia {
  inicio: string;
  fim?: string;
}

// Mesmos campos da criação (T18), todos opcionais: só o que vier é alterado.
// `usuarioId` é quem fez a edição, para a auditoria. `capaArquivoId` é o
// arquivo de capa já gravado (a troca da capa passa por aqui).
export interface EditarCampanhaUseCaseRequest {
  empresaId: string;
  usuarioId: string;
  campanhaId: string;
  nome?: string;
  descricao?: string;
  capaArquivoId?: string;
  instituicaoId?: string;
  causaId?: string;
  regraDoacao?: EditarCampanhaUseCaseRegraDoacao;
  meta?: string;
  vigencia?: EditarCampanhaUseCaseVigencia;
}

export type EditarCampanhaUseCaseResponse = Either<
  | NotAllowedError
  | ResourceNotFoundError
  | NomeCampanhaInvalidoError
  | DescricaoCampanhaInvalidaError
  | InvalidRuleValueError
  | ValorMonetarioInvalidoError
  | PercentualInvalidoError
  | DataInvalidaError
  | VigenciaInvalidaError
  | BeneficiadaAmbiguaError
  | BeneficiadaIndisponivelError
  | CampanhaEmAnaliseError
  | AlteracaoJaPendenteError
  | TransicaoInvalidaError,
  CampanhaDetalhe
>;

@Injectable()
export class EditarCampanhaUseCase {
  constructor(
    private readonly campanhaRepository: CampanhaRepository,
    private readonly registroAuditoriaRepository: RegistroAuditoriaRepository,
    private readonly assegurarEmpresaAprovada: AssegurarEmpresaAprovadaUseCase,
    private readonly assegurarBeneficiadaDisponivel: AssegurarBeneficiadaDisponivelUseCase,
  ) {}

  async execute({
    empresaId,
    usuarioId,
    campanhaId,
    nome,
    descricao,
    capaArquivoId,
    instituicaoId,
    causaId,
    regraDoacao,
    meta,
    vigencia,
  }: EditarCampanhaUseCaseRequest): Promise<EditarCampanhaUseCaseResponse> {
    // Passo 1: o portão de escrita, igual ao da criação.
    const empresaAprovada =
      await this.assegurarEmpresaAprovada.execute(empresaId);

    if (empresaAprovada.isLeft()) {
      return left(empresaAprovada.value);
    }

    // Passo 2: só a empresa dona edita. Campanha alheia responde como
    // inexistente, para não revelar que ela existe.
    const campanha = await this.campanhaRepository.findById(campanhaId);

    if (!campanha || campanha.empresaId.toString() !== empresaId) {
      return left(new ResourceNotFoundError('Campanha não encontrada'));
    }

    // Passo 3: montar os value objects dos campos informados. O primeiro erro
    // volta e nada é gravado.
    let nomeCampanha: NomeCampanha | undefined;

    if (nome !== undefined) {
      const resultado = NomeCampanha.criar(nome);

      if (resultado.isLeft()) {
        return left(resultado.value);
      }

      nomeCampanha = resultado.value;
    }

    let descricaoCampanha: DescricaoCampanha | undefined;

    if (descricao !== undefined) {
      const resultado = DescricaoCampanha.criar(descricao);

      if (resultado.isLeft()) {
        return left(resultado.value);
      }

      descricaoCampanha = resultado.value;
    }

    let beneficiada: Beneficiada | undefined;

    if (instituicaoId !== undefined || causaId !== undefined) {
      const resultado = Beneficiada.criar({ instituicaoId, causaId });

      if (resultado.isLeft()) {
        return left(resultado.value);
      }

      beneficiada = resultado.value;
    }

    let regra: RegraDoacao | undefined;

    if (regraDoacao !== undefined) {
      const resultado = RegraDoacao.criar(regraDoacao);

      if (resultado.isLeft()) {
        return left(resultado.value);
      }

      regra = resultado.value;
    }

    let metaMonetaria: ValorMonetario | undefined;

    if (meta !== undefined) {
      const resultado = ValorMonetario.deDecimal(meta);

      if (resultado.isLeft()) {
        return left(resultado.value);
      }

      metaMonetaria = resultado.value;
    }

    let vigenciaCampanha: Vigencia | undefined;

    if (vigencia !== undefined) {
      const inicio = DataCalendario.criar(vigencia.inicio);

      if (inicio.isLeft()) {
        return left(inicio.value);
      }

      let fim: DataCalendario | undefined;

      if (vigencia.fim !== undefined) {
        const resultadoFim = DataCalendario.criar(vigencia.fim);

        if (resultadoFim.isLeft()) {
          return left(resultadoFim.value);
        }

        fim = resultadoFim.value;
      }

      const resultado = Vigencia.criar({ inicio: inicio.value, fim });

      if (resultado.isLeft()) {
        return left(resultado.value);
      }

      vigenciaCampanha = resultado.value;
    }

    // Passo 4: a beneficiada só é conferida quando muda; a atual já foi
    // conferida quando entrou.
    if (
      beneficiada !== undefined &&
      !(campanha.beneficiada && beneficiada.equals(campanha.beneficiada))
    ) {
      const disponivel = await this.assegurarBeneficiadaDisponivel.execute(
        beneficiada.tipo === 'INSTITUICAO'
          ? { instituicaoId: beneficiada.id }
          : { causaId: beneficiada.id },
      );

      if (disponivel.isLeft()) {
        return left(disponivel.value);
      }
    }

    // Passo 5: a entidade decide o efeito conforme o estado: aplica, volta
    // de REJEITADA para RASCUNHO ou, em APROVADA, abre uma alteração.
    const versaoEsperada = campanha.versao;
    const statusAnterior = campanha.status;
    const tinhaAlteracaoPendente = !!campanha.alteracaoPendente;

    const textos = campanha.editarTextos({
      nome: nomeCampanha,
      descricao: descricaoCampanha,
      capaArquivoId:
        capaArquivoId !== undefined
          ? new UniqueEntityId(capaArquivoId)
          : undefined,
      meta: metaMonetaria,
    });

    if (textos.isLeft()) {
      return left(textos.value);
    }

    if (
      beneficiada !== undefined ||
      regra !== undefined ||
      vigenciaCampanha !== undefined
    ) {
      const compromisso = campanha.editarCompromisso({
        beneficiada,
        regraDoacao: regra,
        vigencia: vigenciaCampanha,
      });

      if (compromisso.isLeft()) {
        return left(compromisso.value);
      }
    }

    // Passo 6: grava só se ninguém gravou a campanha depois da leitura.
    const aplicada = await this.campanhaRepository.salvar(
      campanha,
      versaoEsperada,
    );

    if (!aplicada) {
      return left(new TransicaoInvalidaError());
    }

    // Passo 7: auditoria só quando a edição muda o ciclo da campanha.
    if (
      statusAnterior === CampanhaStatus.REJEITADA &&
      campanha.status === CampanhaStatus.RASCUNHO
    ) {
      await this.registroAuditoriaRepository.registrar({
        id: randomUUID(),
        tipo: 'CAMPANHA_REABERTA',
        descricao: `Campanha ${campanha.nome.valor} reaberta para edição`,
        usuarioId,
        entidadeId: campanha.id.toString(),
        dados: {
          estadoAnterior: statusAnterior,
          estadoNovo: campanha.status,
        },
        criadoEm: new Date(),
      });
    }

    const alteracao = campanha.alteracaoPendente;

    if (!tinhaAlteracaoPendente && alteracao) {
      await this.registroAuditoriaRepository.registrar({
        id: randomUUID(),
        tipo: 'ALTERACAO_CAMPANHA_ABERTA',
        descricao: `Alteração da campanha ${campanha.nome.valor} enviada para análise`,
        usuarioId,
        entidadeId: campanha.id.toString(),
        dados: {
          compromissoAnterior: descreverCompromisso(alteracao.anterior),
          compromissoProposto: descreverCompromisso(alteracao.proposto),
        },
        criadoEm: new Date(),
      });
    }

    return right(montarCampanhaDetalhe(campanha));
  }
}
