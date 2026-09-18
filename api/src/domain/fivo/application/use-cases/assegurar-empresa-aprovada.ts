import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { Injectable } from '@nestjs/common';
import { EmpresaRepository } from '../ports/database/empresa-repository';

const MENSAGEM_CADASTRO_NAO_APROVADO = 'Cadastro ainda não aprovado';

export type AssegurarEmpresaAprovadaUseCaseResponse = Either<
  NotAllowedError | ResourceNotFoundError,
  void
>;

@Injectable()
export class AssegurarEmpresaAprovadaUseCase {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  async execute(
    empresaId: string,
  ): Promise<AssegurarEmpresaAprovadaUseCaseResponse> {
    const empresa = await this.empresaRepository.findById(empresaId);

    if (!empresa) {
      return left(new ResourceNotFoundError('Empresa não encontrada'));
    }

    if (!empresa.estaAprovada()) {
      return left(new NotAllowedError(MENSAGEM_CADASTRO_NAO_APROVADO));
    }

    return right(undefined);
  }
}
