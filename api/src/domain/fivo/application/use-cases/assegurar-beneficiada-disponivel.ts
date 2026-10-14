import { Either, left, right } from '@core/either';
import { Injectable } from '@nestjs/common';
import { BeneficiadaAmbiguaError } from '../errors/beneficiada-ambigua.error';
import { BeneficiadaIndisponivelError } from '../errors/beneficiada-indisponivel.error';
import { CausaRepository } from '../ports/database/causa-repository';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';

export type AssegurarBeneficiadaDisponivelUseCaseRequest = {
  instituicaoId?: string;
  causaId?: string;
};

export type AssegurarBeneficiadaDisponivelUseCaseResponse = Either<
  BeneficiadaAmbiguaError | BeneficiadaIndisponivelError,
  void
>;

@Injectable()
export class AssegurarBeneficiadaDisponivelUseCase {
  constructor(
    private readonly instituicaoRepository: InstituicaoRepository,
    private readonly causaRepository: CausaRepository,
  ) {}

  async execute({
    instituicaoId,
    causaId,
  }: AssegurarBeneficiadaDisponivelUseCaseRequest): Promise<AssegurarBeneficiadaDisponivelUseCaseResponse> {
    if (instituicaoId && !causaId) {
      const instituicao =
        await this.instituicaoRepository.findById(instituicaoId);

      if (!instituicao || !instituicao.estaDisponivelParaSelecao()) {
        return left(new BeneficiadaIndisponivelError());
      }

      return right(undefined);
    }

    if (causaId && !instituicaoId) {
      const causa = await this.causaRepository.findById(causaId);

      if (!causa || !causa.estaAtiva()) {
        return left(new BeneficiadaIndisponivelError());
      }

      return right(undefined);
    }

    return left(new BeneficiadaAmbiguaError());
  }
}
