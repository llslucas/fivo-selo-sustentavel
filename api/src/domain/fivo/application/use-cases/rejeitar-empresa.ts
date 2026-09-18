import { randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { MotivoInsuficienteError } from '../errors/motivo-insuficiente.error';
import { User, UserRole } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { UserRepository } from '../ports/database/user-repository';
import { RegistroAuditoriaRepository } from '../ports/registro-auditoria-repository';
import { Mailer, TemplateEmail } from '../ports/mailer';

export type RejeitarEmpresaUseCaseResponse = Either<
  | NotAllowedError
  | ResourceNotFoundError
  | TransicaoInvalidaError
  | MotivoInsuficienteError,
  void
>;

@Injectable()
export class RejeitarEmpresaUseCase {
  constructor(
    private readonly empresaRepository: EmpresaRepository,
    private readonly userRepository: UserRepository,
    private readonly registroAuditoriaRepository: RegistroAuditoriaRepository,
    private readonly mailer: Mailer,
  ) {}

  async execute(
    empresaId: string,
    user: User,
    motivo: string,
  ): Promise<RejeitarEmpresaUseCaseResponse> {
    if (user.role !== UserRole.ADMIN) {
      return left(new NotAllowedError());
    }

    const empresa = await this.empresaRepository.findById(empresaId);

    if (!empresa) {
      return left(new ResourceNotFoundError('Empresa não encontrada'));
    }

    const statusAnterior = empresa.status;
    const result = empresa.rejeitar(user.id, motivo);

    if (result.isLeft()) {
      return left(result.value);
    }

    await this.empresaRepository.save(empresa);

    await this.registroAuditoriaRepository.registrar({
      id: randomUUID(),
      tipo: 'EMPRESA_REJEITADA',
      descricao: `Empresa ${empresa.razaoSocial} rejeitada`,
      usuarioId: user.id.toString(),
      entidadeId: empresa.id.toString(),
      dados: {
        estadoAnterior: statusAnterior,
        estadoNovo: empresa.status,
        motivo,
      },
      criadoEm: new Date(),
    });

    const empresaUser = empresa.usuarioId
      ? await this.userRepository.findById(empresa.usuarioId.toString())
      : null;

    if (empresaUser) {
      try {
        await this.mailer.enviar({
          para: empresaUser.email,
          template: TemplateEmail.CADASTRO_REJEITADO,
          dados: { motivo },
        });
      } catch (error) {
        console.error(
          'Falha ao enviar e-mail de rejeição de cadastro de empresa',
          error,
        );
      }
    }

    return right(undefined);
  }
}
