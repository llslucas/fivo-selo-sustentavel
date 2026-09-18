import { Injectable } from '@nestjs/common';

import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { UserAlreadyExistsError } from '@domain/fivo/application/errors/users-already-exists.error';
import { User } from '@domain/fivo/entities/user';

import { ehViolacaoDeUnicidade } from './erros-prisma';
import { PrismaUserMapper } from './mappers/prisma-user-mapper';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const usuario = await this.prisma.usuario.findUnique({ where: { id } });

    return usuario ? PrismaUserMapper.toDomain(usuario) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const usuario = await this.prisma.usuario.findUnique({ where: { email } });

    return usuario ? PrismaUserMapper.toDomain(usuario) : null;
  }

  async create(user: User): Promise<void> {
    try {
      await this.prisma.usuario.create({
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
      await this.prisma.usuario.update({
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
