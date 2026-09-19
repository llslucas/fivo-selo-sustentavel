import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { UserAlreadyExistsError } from '@domain/fivo/application/errors/users-already-exists.error';
import { User } from '@domain/fivo/entities/user';

import { ehViolacaoDeUnicidade } from './erros-prisma';
import { PrismaUserMapper } from './mappers/prisma-user-mapper';
import { PrismaTransactionContext } from './prisma-transaction-context';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: PrismaTransactionContext,
  ) {}

  private get db(): Prisma.TransactionClient {
    return this.contexto.atual() ?? this.prisma;
  }

  async findById(id: string): Promise<User | null> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    return usuario ? PrismaUserMapper.toDomain(usuario) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });

    return usuario ? PrismaUserMapper.toDomain(usuario) : null;
  }

  async findByEmailParaAtualizacao(email: string): Promise<User | null> {
    // FOR NO KEY UPDATE serializa quem atualiza a mesma linha sem bloquear a
    // checagem de FK de `sessao`, que usa FOR KEY SHARE.
    await this.db
      .$queryRaw`SELECT id FROM usuario WHERE email = ${email} FOR NO KEY UPDATE`;

    const usuario = await this.db.usuario.findUnique({ where: { email } });

    return usuario ? PrismaUserMapper.toDomain(usuario) : null;
  }

  async create(user: User): Promise<void> {
    try {
      await this.db.usuario.create({
        data: PrismaUserMapper.toPrisma(user),
      });
    } catch (erro) {
      // Corrida entre a checagem de unicidade do caso de uso e o INSERT:
      // o erro do banco vira o mesmo erro de domínio (409).
      if (ehViolacaoDeUnicidade(erro)) {
        throw new UserAlreadyExistsError();
      }

      throw erro;
    }
  }

  async save(user: User): Promise<void> {
    try {
      await this.db.usuario.update({
        where: { id: user.id.toString() },
        data: PrismaUserMapper.toPrisma(user),
      });
    } catch (erro) {
      if (ehViolacaoDeUnicidade(erro)) {
        throw new UserAlreadyExistsError();
      }

      throw erro;
    }
  }
}
