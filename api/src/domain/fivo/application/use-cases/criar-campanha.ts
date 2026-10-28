import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Beneficiada } from '@domain/fivo/entities/beneficiada';
import { Campanha } from '@domain/fivo/entities/campanha';
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
import { BeneficiadaAmbiguaError } from '../errors/beneficiada-ambigua.error';
import { BeneficiadaIndisponivelError } from '../errors/beneficiada-indisponivel.error';
import { DataInvalidaError } from '../errors/data-invalida.error';
import { DescricaoCampanhaInvalidaError } from '../errors/descricao-campanha-invalida.error';
import { InvalidRuleValueError } from '../errors/invalid-rule-value.error';
import { NomeCampanhaInvalidoError } from '../errors/nome-campanha-invalido.error';
import { PercentualInvalidoError } from '../errors/percentual-invalido.error';
import { ValorMonetarioInvalidoError } from '../errors/valor-monetario-invalido.error';
import { VigenciaInvalidaError } from '../errors/vigencia-invalida.error';
import { CampanhaRepository } from '../ports/database/campanha-repository';
import { AssegurarBeneficiadaDisponivelUseCase } from './assegurar-beneficiada-disponivel';
import { AssegurarEmpresaAprovadaUseCase } from './assegurar-empresa-aprovada';

export interface CriarCampanhaUseCaseRegraDoacao {
  tipo: TipoRegraDoacao;
  valor?: string;
  percentual?: string;
}

export interface CriarCampanhaUseCaseVigencia {
  inicio: string;
  fim?: string;
}

export interface CriarCampanhaUseCaseRequest {
  empresaId: string;
  nome: string;
  descricao?: string;
  instituicaoId?: string;
  causaId?: string;
  regraDoacao?: CriarCampanhaUseCaseRegraDoacao;
  meta?: string;
  vigencia?: CriarCampanhaUseCaseVigencia;
}

export type CriarCampanhaUseCaseResponse = Either<
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
  | BeneficiadaIndisponivelError,
  { id: string; idPublico: string }
>;

@Injectable()
export class CriarCampanhaUseCase {
  constructor(
    private readonly campanhaRepository: CampanhaRepository,
    private readonly assegurarEmpresaAprovada: AssegurarEmpresaAprovadaUseCase,
    private readonly assegurarBeneficiadaDisponivel: AssegurarBeneficiadaDisponivelUseCase,
  ) {}

  async execute({
    empresaId,
    nome,
    descricao,
    instituicaoId,
    causaId,
    regraDoacao,
    meta,
    vigencia,
  }: CriarCampanhaUseCaseRequest): Promise<CriarCampanhaUseCaseResponse> {
    // Passo 1: o portão de escrita. Empresa não aprovada responde 403 com a
    // mensagem da spec, e nada é montado nem gravado.
    const empresaAprovada =
      await this.assegurarEmpresaAprovada.execute(empresaId);

    if (empresaAprovada.isLeft()) {
      return left(empresaAprovada.value);
    }

    // Passo 2: montar os value objects dos campos informados. O primeiro erro
    // volta e nada é gravado.
    const nomeCampanha = NomeCampanha.criar(nome);

    if (nomeCampanha.isLeft()) {
      return left(nomeCampanha.value);
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

    // Passo 3: se veio beneficiada, ela precisa estar disponível no catálogo.
    if (beneficiada !== undefined) {
      const disponivel = await this.assegurarBeneficiadaDisponivel.execute(
        beneficiada.tipo === 'INSTITUICAO'
          ? { instituicaoId: beneficiada.id }
          : { causaId: beneficiada.id },
      );

      if (disponivel.isLeft()) {
        return left(disponivel.value);
      }
    }

    // Passo 4: nasce RASCUNHO só com o nome; os campos opcionais entram pelos
    // métodos de edição da entidade. Em RASCUNHO nenhuma edição falha.
    const campanha = Campanha.criar({
      empresaId: new UniqueEntityId(empresaId),
      nome: nomeCampanha.value,
    });

    campanha.editarTextos({
      descricao: descricaoCampanha,
      meta: metaMonetaria,
    });

    campanha.editarCompromisso(
      { beneficiada, regraDoacao: regra, vigencia: vigenciaCampanha },
      DataCalendario.hojeEm(new Date()),
    );

    await this.campanhaRepository.create(campanha);

    return right({
      id: campanha.id.toString(),
      idPublico: campanha.idPublico.toString(),
    });
  }
}
