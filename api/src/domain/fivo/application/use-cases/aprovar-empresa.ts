import { randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { User, UserRole } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { UserRepository } from '../ports/database/user-repository';
import { RegistroAuditoriaRepository } from '../ports/registro-auditoria-repository';
import { Mailer, TemplateEmail } from '../ports/mailer';

export type AprovarEmpresaUseCaseResponse = Either<
  NotAllowedError | ResourceNotFoundError | TransicaoInvalidaError,
  void
>;

@Injectable()
export class AprovarEmpresaUseCase {
  constructor(
    private readonly empresaRepository: EmpresaRepository,
    private readonly userRepository: UserRepository,
    private readonly registroAuditoriaRepository: RegistroAuditoriaRepository,
    private readonly mailer: Mailer,
  ) {}

  async execute(
    empresaId: string,
    user: User,
  ): Promise<AprovarEmpresaUseCaseResponse> {
    if (user.role !== UserRole.ADMIN) {
      return left(new NotAllowedError());
    }

    const empresa = await this.empresaRepository.findById(empresaId);

    if (!empresa) {
      return left(new ResourceNotFoundError('Empresa não encontrada'));
    }

    const statusAnterior = empresa.status;
    const result = empresa.aprovar(user.id);

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
      tipo: 'EMPRESA_APROVADA',
      descricao: `Empresa ${empresa.razaoSocial} aprovada`,
      usuarioId: user.id.toString(),
      entidadeId: empresa.id.toString(),
      dados: { estadoAnterior: statusAnterior, estadoNovo: empresa.status },
      criadoEm: new Date(),
    });

    const empresaUser = empresa.usuarioId
      ? await this.userRepository.findById(empresa.usuarioId.toString())
      : null;

    if (empresaUser) {
      try {
        await this.mailer.enviar({
          para: empresaUser.email,
          template: TemplateEmail.CADASTRO_APROVADO,
        });
      } catch (error) {
        console.error(
          'Falha ao enviar e-mail de aprovação de cadastro de empresa',
          error,
        );
      }
    }

    return right(undefined);
  }
}
