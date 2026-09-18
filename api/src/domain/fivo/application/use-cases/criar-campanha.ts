import { Campanha, RegraType } from '@domain/fivo/entities/campanha';
import { CampanhaRepository } from '../ports/database/campanha-repository';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { InvalidRuleValueError } from '../errors/invalid-rule-value.error';
import { Either, left, right } from '@core/either';

export interface CriarCampanhaUseCaseRequest {
  empresa_id: string;
  instituicao_id: string;
  nome: string;
  descricao: string;
  regra_tipo: RegraType;
  regra_valor_brl: number | null;
  regra_percentual: number | null;
  meta_valor_brl: number;
  data_inicio: Date;
  data_fim: Date;
}

export type CriarCampanhaUseCaseResponse = Either<
  ResourceNotFoundError | InvalidRuleValueError,
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
    regra_valor_brl,
    regra_percentual,
    meta_valor_brl,
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

    if (regra_tipo === RegraType.VALOR_PERCENTUAL) {
      if (
        !regra_percentual ||
        regra_percentual <= 0 ||
        regra_percentual > 100
      ) {
        return left(new InvalidRuleValueError());
      }

      regra_valor_brl = null;
    }

    if (regra_tipo === RegraType.VALOR_FIXO) {
      if (!regra_valor_brl || regra_valor_brl <= 0) {
        return left(new InvalidRuleValueError());
      }

      regra_percentual = null;
    }

    const campanha = Campanha.create({
      empresa,
      instituicao,
      nome,
      descricao,
      regra_tipo,
      regra_valor_brl,
      regra_percentual,
      meta_valor_brl,
      data_inicio,
      data_fim,
    });

    await this.campanhaRepository.create(campanha);

    return right({ campanha });
  }
}
