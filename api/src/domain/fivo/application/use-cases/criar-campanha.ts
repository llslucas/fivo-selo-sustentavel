import { Campanha } from '@domain/fivo/entities/campanha';
import { NomeCampanha } from '@domain/fivo/entities/nome-campanha';
import { DescricaoCampanha } from '@domain/fivo/entities/descricao-campanha';
import { Beneficiada } from '@domain/fivo/entities/beneficiada';
import {
  RegraDoacao,
  TipoRegraDoacao,
} from '@domain/fivo/entities/regra-doacao';
import { ValorMonetario } from '@domain/fivo/entities/valor-monetario';
import { DataCalendario } from '@domain/fivo/entities/data-calendario';
import { Vigencia } from '@domain/fivo/entities/vigencia';
import { CampanhaRepository } from '../ports/database/campanha-repository';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { InvalidRuleValueError } from '../errors/invalid-rule-value.error';
import { NomeCampanhaInvalidoError } from '../errors/nome-campanha-invalido.error';
import { DescricaoCampanhaInvalidaError } from '../errors/descricao-campanha-invalida.error';
import { BeneficiadaAmbiguaError } from '../errors/beneficiada-ambigua.error';
import { ValorMonetarioInvalidoError } from '../errors/valor-monetario-invalido.error';
import { PercentualInvalidoError } from '../errors/percentual-invalido.error';
import { DataInvalidaError } from '../errors/data-invalida.error';
import { VigenciaInvalidaError } from '../errors/vigencia-invalida.error';
import { Either, left, right } from '@core/either';

// Ajuste mecânico para a entidade nova (T13); o caso de uso é reescrito na T18.
export interface CriarCampanhaUseCaseRequest {
  empresa_id: string;
  instituicao_id: string;
  nome: string;
  descricao: string;
  regra_tipo: TipoRegraDoacao;
  regra_valor?: string;
  regra_percentual?: string;
  meta_valor: string;
  data_inicio: string;
  data_fim?: string;
}

export type CriarCampanhaUseCaseResponse = Either<
  | ResourceNotFoundError
  | InvalidRuleValueError
  | NomeCampanhaInvalidoError
  | DescricaoCampanhaInvalidaError
  | BeneficiadaAmbiguaError
  | ValorMonetarioInvalidoError
  | PercentualInvalidoError
  | DataInvalidaError
  | VigenciaInvalidaError,
  { campanha: Campanha }
>;

export class CriarCampanhaUseCase {
  constructor(
    private readonly campanhaRepository: CampanhaRepository,
    private readonly empresaRepository: EmpresaRepository,
    private readonly instituicaoRepository: InstituicaoRepository,
  ) {}

  async execute({
    empresa_id,
    instituicao_id,
    nome,
    descricao,
    regra_tipo,
    regra_valor,
    regra_percentual,
    meta_valor,
    data_inicio,
    data_fim,
  }: CriarCampanhaUseCaseRequest): Promise<CriarCampanhaUseCaseResponse> {
    const empresa = await this.empresaRepository.findById(empresa_id);

    if (!empresa) {
      return left(new ResourceNotFoundError('Empresa não encontrada'));
    }

    const instituicao =
      await this.instituicaoRepository.findById(instituicao_id);

    if (!instituicao) {
      return left(new ResourceNotFoundError('Instituição não encontrada'));
    }

    const nomeCampanha = NomeCampanha.criar(nome);
    if (nomeCampanha.isLeft()) return left(nomeCampanha.value);

    const descricaoCampanha = DescricaoCampanha.criar(descricao);
    if (descricaoCampanha.isLeft()) return left(descricaoCampanha.value);

    const beneficiada = Beneficiada.criar({
      instituicaoId: instituicao.id.toString(),
    });
    if (beneficiada.isLeft()) return left(beneficiada.value);

    const regraDoacao = RegraDoacao.criar({
      tipo: regra_tipo,
      valor: regra_valor,
      percentual: regra_percentual,
    });
    if (regraDoacao.isLeft()) return left(regraDoacao.value);

    const meta = ValorMonetario.deDecimal(meta_valor);
    if (meta.isLeft()) return left(meta.value);

    const inicio = DataCalendario.criar(data_inicio);
    if (inicio.isLeft()) return left(inicio.value);

    let fim: DataCalendario | undefined;
    if (data_fim !== undefined) {
      const dataFim = DataCalendario.criar(data_fim);
      if (dataFim.isLeft()) return left(dataFim.value);
      fim = dataFim.value;
    }

    const vigencia = Vigencia.criar({ inicio: inicio.value, fim });
    if (vigencia.isLeft()) return left(vigencia.value);

    const campanha = Campanha.criar({
      empresaId: empresa.id,
      nome: nomeCampanha.value,
    });

    campanha.editarTextos({
      descricao: descricaoCampanha.value,
      meta: meta.value,
    });
    campanha.editarCompromisso({
      beneficiada: beneficiada.value,
      regraDoacao: regraDoacao.value,
      vigencia: vigencia.value,
    });

    await this.campanhaRepository.create(campanha);

    return right({ campanha });
  }
}
