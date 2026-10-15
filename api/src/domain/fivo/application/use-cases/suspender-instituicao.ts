import { randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { User, UserRole } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';
import { RegistroAuditoriaRepository } from '../ports/registro-auditoria-repository';

export type SuspenderInstituicaoUseCaseResponse = Either<
  NotAllowedError | ResourceNotFoundError | TransicaoInvalidaError,
  void
>;

@Injectable()
export class SuspenderInstituicaoUseCase {
  constructor(
    private readonly instituicaoRepository: InstituicaoRepository,
    private readonly registroAuditoriaRepository: RegistroAuditoriaRepository,
  ) {}

  async execute(
    instituicaoId: string,
    user: User,
  ): Promise<SuspenderInstituicaoUseCaseResponse> {
    if (user.role !== UserRole.ADMIN) {
      return left(new NotAllowedError());
    }

    const instituicao =
      await this.instituicaoRepository.findById(instituicaoId);

    if (!instituicao) {
      return left(new ResourceNotFoundError('Instituição não encontrada'));
    }

    const statusAnterior = instituicao.status;
    const result = instituicao.suspender(user.id);

    if (result.isLeft()) {
      return left(result.value);
    }

    const aplicada = await this.instituicaoRepository.salvarTransicao(
      instituicao,
      statusAnterior,
    );

    if (!aplicada) {
      return left(new TransicaoInvalidaError());
    }

    await this.registroAuditoriaRepository.registrar({
      id: randomUUID(),
      tipo: 'INSTITUICAO_SUSPENSA',
      descricao: `Instituição ${instituicao.razaoSocial} suspensa`,
      usuarioId: user.id.toString(),
      entidadeId: instituicao.id.toString(),
      dados: { estadoAnterior: statusAnterior, estadoNovo: instituicao.status },
      criadoEm: new Date(),
    });

    return right(undefined);
  }
}
