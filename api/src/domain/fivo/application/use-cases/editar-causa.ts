import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { Causa } from '@domain/fivo/entities/causa';
import { User, UserRole } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CausaJaExisteError } from '../errors/causa-ja-existe.error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { CausaRepository } from '../ports/database/causa-repository';
import { RegistroAuditoriaRepository } from '../ports/registro-auditoria-repository';

interface EditarCausaUseCaseRequest {
  causaId: string;
  nome?: string;
  descricao?: string;
  user: User;
}

export type EditarCausaUseCaseResponse = Either<
  | NotAllowedError
  | ResourceNotFoundError
  | CausaJaExisteError
  | TransicaoInvalidaError,
  void
>;

@Injectable()
export class EditarCausaUseCase {
  constructor(
    private readonly causaRepository: CausaRepository,
    private readonly registroAuditoriaRepository: RegistroAuditoriaRepository,
  ) {}

  async execute({
    causaId,
    nome,
    descricao,
    user,
  }: EditarCausaUseCaseRequest): Promise<EditarCausaUseCaseResponse> {
    if (user.role !== UserRole.ADMIN) {
      return left(new NotAllowedError());
    }

    const causa = await this.causaRepository.findById(causaId);

    if (!causa) {
      return left(new ResourceNotFoundError('Causa não encontrada'));
    }

    if (nome) {
      const causaExistente = await this.causaRepository.findByNome(nome);

      if (causaExistente && causaExistente.nome !== causa.nome) {
        return left(new CausaJaExisteError());
      }
    }

    const causaAntiga = Causa.create(causa, causa.id);

    const result = causa.editar(
      nome ?? causa.nome,
      descricao ?? causa.descricao,
    );

    if (result.isLeft()) {
      return left(result.value);
    }

    await this.causaRepository.save(causa);
    await this.registroAuditoriaRepository.registrar({
      id: randomUUID(),
      tipo: 'CAUSA_EDITADA',
      descricao: `Causa ${causa.nome} foi editada`,
      usuarioId: user.id.toString(),
      entidadeId: causa.id.toString(),
      dados: { causa_antiga: causaAntiga, nova_causa: causa },
      criadoEm: new Date(),
    });

    return right(void 0);
  }
}
