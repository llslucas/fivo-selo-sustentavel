import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { User, UserRole } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CausaComInstituicoesAprovadasError } from '../errors/causa-com-instituicoes-aprovadas.error';
import { InstituicaoRepository } from '../ports/database/instituicao-repository';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { CausaRepository } from '../ports/database/causa-repository';
import { RegistroAuditoriaRepository } from '../ports/registro-auditoria-repository';

interface InativarCausaUseCaseRequest {
  causaId: string;
  user: User;
}

export type InativarCausaUseCaseResponse = Either<
  | NotAllowedError
  | ResourceNotFoundError
  | CausaComInstituicoesAprovadasError
  | TransicaoInvalidaError,
  void
>;

@Injectable()
export class InativarCausaUseCase {
  constructor(
    private readonly causaRepository: CausaRepository,
    private readonly instituicaoRepository: InstituicaoRepository,
    private readonly registroAuditoriaRepository: RegistroAuditoriaRepository,
  ) {}

  async execute({
    causaId,
    user,
  }: InativarCausaUseCaseRequest): Promise<InativarCausaUseCaseResponse> {
    if (user.role !== UserRole.ADMIN) {
      return left(new NotAllowedError());
    }

    const causa = await this.causaRepository.findById(causaId);

    if (!causa) {
      return left(new ResourceNotFoundError('Causa não encontrada'));
    }

    const instituicoesAprovadas =
      await this.instituicaoRepository.listarAprovadasPorCausa(
        causa.id.toString(),
        'asc',
      );

    if (instituicoesAprovadas.length > 0) {
      const nomes = instituicoesAprovadas.map(
        (instituicao) => instituicao.nomeFantasia,
      );

      return left(new CausaComInstituicoesAprovadasError(nomes));
    }

    const statusAnterior = causa.status;
    const result = causa.inativar();

    if (result.isLeft()) {
      return left(result.value);
    }

    await this.causaRepository.save(causa);
    await this.registroAuditoriaRepository.registrar({
      id: randomUUID(),
      tipo: 'CAUSA_INATIVADA',
      descricao: `Causa ${causa.nome} foi inativada`,
      usuarioId: user.id.toString(),
      entidadeId: causa.id.toString(),
      dados: { estadoAnterior: statusAnterior, estadoNovo: causa.status },
      criadoEm: new Date(),
    });

    return right(void 0);
  }
}
