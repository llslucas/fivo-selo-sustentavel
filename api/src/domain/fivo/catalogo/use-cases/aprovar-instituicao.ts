import { randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import {
  TransicaoInvalidaError,
  RegistroAuditoriaRepository,
  Mailer,
  TemplateEmail,
} from '@domain/fivo/shared';
import { DocumentoIndisponivelError } from '../errors/documento-indisponivel.error';
import { User, UserRole, UserRepository } from '@domain/fivo/identidade';
import { Injectable } from '@nestjs/common';
import { InstituicaoRepository } from '../ports/instituicao-repository';
import { VerificadorDeDocumento } from '../ports/verificador-de-documento';

export type AprovarInstituicaoUseCaseResponse = Either<
  | NotAllowedError
  | ResourceNotFoundError
  | TransicaoInvalidaError
  | DocumentoIndisponivelError,
  void
>;

@Injectable()
export class AprovarInstituicaoUseCase {
  constructor(
    private readonly instituicaoRepository: InstituicaoRepository,
    private readonly userRepository: UserRepository,
    private readonly registroAuditoriaRepository: RegistroAuditoriaRepository,
    private readonly verificadorDeDocumento: VerificadorDeDocumento,
    private readonly mailer: Mailer,
  ) {}

  async execute(
    instituicaoId: string,
    user: User,
  ): Promise<AprovarInstituicaoUseCaseResponse> {
    if (user.role !== UserRole.ADMIN) {
      return left(new NotAllowedError());
    }

    const instituicao =
      await this.instituicaoRepository.findById(instituicaoId);

    if (!instituicao) {
      return left(new ResourceNotFoundError('Instituição não encontrada'));
    }

    const legivel = await this.verificadorDeDocumento.estaLegivel(
      instituicao.documento.arquivoId.toString(),
    );

    if (!legivel) {
      return left(new DocumentoIndisponivelError());
    }

    const statusAnterior = instituicao.status;
    const result = instituicao.aprovar(user.id);

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
      tipo: 'INSTITUICAO_APROVADA',
      descricao: `Instituição ${instituicao.razaoSocial} aprovada`,
      usuarioId: user.id.toString(),
      entidadeId: instituicao.id.toString(),
      dados: { estadoAnterior: statusAnterior, estadoNovo: instituicao.status },
      criadoEm: new Date(),
    });

    const usuarioDaInstituicao = instituicao.usuarioId
      ? await this.userRepository.findById(instituicao.usuarioId.toString())
      : null;

    if (usuarioDaInstituicao) {
      try {
        await this.mailer.enviar({
          para: usuarioDaInstituicao.email,
          template: TemplateEmail.CADASTRO_APROVADO,
        });
      } catch (error) {
        console.error(
          'Falha ao enviar e-mail de aprovação de cadastro de instituição',
          error,
        );
      }
    }

    return right(undefined);
  }
}
