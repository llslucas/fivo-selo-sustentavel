import { randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { MotivoInsuficienteError } from '../errors/motivo-insuficiente.error';
import { User, UserRole } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';
import { UserRepository } from '../ports/database/user-repository';
import { RegistroAuditoriaRepository } from '../ports/registro-auditoria-repository';
import { Mailer, TemplateEmail } from '../ports/mailer';

export type RejeitarInstituicaoUseCaseResponse = Either<
  | NotAllowedError
  | ResourceNotFoundError
  | TransicaoInvalidaError
  | MotivoInsuficienteError,
  void
>;

@Injectable()
export class RejeitarInstituicaoUseCase {
  constructor(
    private readonly instituicaoRepository: InstituicaoRepository,
    private readonly userRepository: UserRepository,
    private readonly registroAuditoriaRepository: RegistroAuditoriaRepository,
    private readonly mailer: Mailer,
  ) {}

  async execute(
    instituicaoId: string,
    user: User,
    motivo: string,
  ): Promise<RejeitarInstituicaoUseCaseResponse> {
    if (user.role !== UserRole.ADMIN) {
      return left(new NotAllowedError());
    }

    const instituicao =
      await this.instituicaoRepository.findById(instituicaoId);

    if (!instituicao) {
      return left(new ResourceNotFoundError('Instituição não encontrada'));
    }

    const statusAnterior = instituicao.status;
    const result = instituicao.rejeitar(user.id, motivo);

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
      tipo: 'INSTITUICAO_REJEITADA',
      descricao: `Instituição ${instituicao.razaoSocial} rejeitada`,
      usuarioId: user.id.toString(),
      entidadeId: instituicao.id.toString(),
      dados: {
        estadoAnterior: statusAnterior,
        estadoNovo: instituicao.status,
        motivo,
      },
      criadoEm: new Date(),
    });

    const usuarioDaInstituicao = instituicao.usuarioId
      ? await this.userRepository.findById(instituicao.usuarioId.toString())
      : null;

    if (usuarioDaInstituicao) {
      try {
        await this.mailer.enviar({
          para: usuarioDaInstituicao.email,
          template: TemplateEmail.CADASTRO_REJEITADO,
          dados: { motivo },
        });
      } catch (error) {
        console.error(
          'Falha ao enviar e-mail de rejeição de cadastro de instituição',
          error,
        );
      }
    }

    return right(undefined);
  }
}
