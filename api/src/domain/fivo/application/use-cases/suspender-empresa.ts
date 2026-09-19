import { randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { User, UserRole } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { RegistroAuditoriaRepository } from '../ports/registro-auditoria-repository';

export type SuspenderEmpresaUseCaseResponse = Either<
  NotAllowedError | ResourceNotFoundError | TransicaoInvalidaError,
  void
>;

@Injectable()
export class SuspenderEmpresaUseCase {
  constructor(
    private readonly empresaRepository: EmpresaRepository,
    private readonly registroAuditoriaRepository: RegistroAuditoriaRepository,
  ) {}

  async execute(
    empresaId: string,
    user: User,
  ): Promise<SuspenderEmpresaUseCaseResponse> {
    if (user.role !== UserRole.ADMIN) {
      return left(new NotAllowedError());
    }

    const empresa = await this.empresaRepository.findById(empresaId);

    if (!empresa) {
      return left(new ResourceNotFoundError('Empresa não encontrada'));
    }

    const statusAnterior = empresa.status;
    const result = empresa.suspender(user.id);

    if (result.isLeft()) {
      return left(result.value);
    }

    const aplicada = await this.empresaRepository.salvarTransicao(
      empresa,
      statusAnterior,
    );

    if (!aplicada) {
      return left(new TransicaoInvalidaError());
    }

    await this.registroAuditoriaRepository.registrar({
      id: randomUUID(),
      tipo: 'EMPRESA_SUSPENSA',
      descricao: `Empresa ${empresa.razaoSocial} suspensa`,
      usuarioId: user.id.toString(),
      entidadeId: empresa.id.toString(),
      dados: { estadoAnterior: statusAnterior, estadoNovo: empresa.status },
      criadoEm: new Date(),
    });

    return right(undefined);
  }
}
