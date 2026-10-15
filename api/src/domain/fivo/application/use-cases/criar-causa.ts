import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { Causa } from '@domain/fivo/entities/causa';
import { User, UserRole } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CausaJaExisteError } from '../errors/causa-ja-existe.error';
import { NomeCausaInvalidoError } from '../errors/nome-causa-invalido.error';
import { CausaRepository } from '../ports/database/causa-repository';
import { RegistroAuditoriaRepository } from '../ports/registro-auditoria-repository';

interface CriarCausaUseCaseRequest {
  nome: string;
  descricao: string;
  user: User;
}

export type CriarCausaUseCaseResponse = Either<
  NotAllowedError | CausaJaExisteError | NomeCausaInvalidoError,
  {
    causaId: string;
  }
>;

@Injectable()
export class CriarCausaUseCase {
  constructor(
    private readonly causaRepository: CausaRepository,
    private readonly registroAuditoriaRepository: RegistroAuditoriaRepository,
  ) {}

  async execute({
    nome,
    descricao,
    user,
  }: CriarCausaUseCaseRequest): Promise<CriarCausaUseCaseResponse> {
    if (user.role !== UserRole.ADMIN) {
      return left(new NotAllowedError());
    }

    const existingCausa = await this.causaRepository.findByNome(nome);

    if (existingCausa) {
      return left(new CausaJaExisteError());
    }

    const causa = Causa.create({
      nome,
      descricao,
    });

    if (causa.isLeft()) {
      return left(causa.value);
    }

    await this.causaRepository.create(causa.value);

    await this.registroAuditoriaRepository.registrar({
      id: randomUUID(),
      tipo: 'CAUSA_CRIADA',
      descricao: `Causa ${causa.value.nome} criada`,
      usuarioId: user.id.toString(),
      entidadeId: causa.value.id.toString(),
      dados: { nova_causa: causa.value },
      criadoEm: new Date(),
    });

    return right({ causaId: causa.value.id.toString() });
  }
}
