import { randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { User, UserRole } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { MotivoInsuficienteError } from '../errors/motivo-insuficiente.error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { CampanhaRepository } from '../ports/database/campanha-repository';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { UserRepository } from '../ports/database/user-repository';
import { Mailer, TemplateEmail } from '../ports/mailer';
import { RegistroAuditoriaRepository } from '../ports/registro-auditoria-repository';

export type RejeitarCampanhaUseCaseResponse = Either<
  | NotAllowedError
  | ResourceNotFoundError
  | TransicaoInvalidaError
  | MotivoInsuficienteError,
  void
>;

@Injectable()
export class RejeitarCampanhaUseCase {
  constructor(
    private readonly campanhaRepository: CampanhaRepository,
    private readonly empresaRepository: EmpresaRepository,
    private readonly userRepository: UserRepository,
    private readonly registroAuditoriaRepository: RegistroAuditoriaRepository,
    private readonly mailer: Mailer,
  ) {}

  async execute(
    campanhaId: string,
    user: User,
    motivo: string,
  ): Promise<RejeitarCampanhaUseCaseResponse> {
    if (user.role !== UserRole.ADMIN) {
      return left(new NotAllowedError());
    }

    const campanha = await this.campanhaRepository.findById(campanhaId);

    if (!campanha) {
      return left(new ResourceNotFoundError('Campanha não encontrada'));
    }

    const statusAnterior = campanha.status;
    const versaoEsperada = campanha.versao;
    const result = campanha.rejeitar(user.id, motivo);

    if (result.isLeft()) {
      return left(result.value);
    }

    const aplicada = await this.campanhaRepository.salvar(
      campanha,
      versaoEsperada,
    );

    if (!aplicada) {
      return left(new TransicaoInvalidaError());
    }

    await this.registroAuditoriaRepository.registrar({
      id: randomUUID(),
      tipo: 'CAMPANHA_REJEITADA',
      descricao: `Campanha ${campanha.nome.valor} rejeitada`,
      usuarioId: user.id.toString(),
      entidadeId: campanha.id.toString(),
      dados: {
        estadoAnterior: statusAnterior,
        estadoNovo: campanha.status,
        motivo,
      },
      criadoEm: new Date(),
    });

    const empresa = await this.empresaRepository.findById(
      campanha.empresaId.toString(),
    );
    const dono = empresa?.usuarioId
      ? await this.userRepository.findById(empresa.usuarioId.toString())
      : null;

    if (dono) {
      try {
        await this.mailer.enviar({
          para: dono.email,
          template: TemplateEmail.CAMPANHA_REJEITADA,
          dados: { nomeCampanha: campanha.nome.valor, motivo },
        });
      } catch (error) {
        console.error('Falha ao enviar e-mail de rejeição de campanha', error);
      }
    }

    return right(undefined);
  }
}