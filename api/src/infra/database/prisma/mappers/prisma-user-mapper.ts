import { Prisma, UserRole as UserRolePrisma, Usuario } from '@prisma/client';

import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Senha } from '@domain/fivo/entities/senha';
import { User, UserRole } from '@domain/fivo/entities/user';

const ROLE_PARA_PRISMA: Record<UserRole, UserRolePrisma> = {
  [UserRole.ADMIN]: UserRolePrisma.ADMIN,
  [UserRole.EMPRESA]: UserRolePrisma.EMPRESA,
  [UserRole.INSTITUICAO]: UserRolePrisma.INSTITUICAO,
};

const ROLE_PARA_DOMINIO: Record<UserRolePrisma, UserRole> = {
  [UserRolePrisma.ADMIN]: UserRole.ADMIN,
  [UserRolePrisma.EMPRESA]: UserRole.EMPRESA,
  [UserRolePrisma.INSTITUICAO]: UserRole.INSTITUICAO,
};

export class PrismaUserMapper {
  static toDomain(raw: Usuario): User {
    // A coluna guarda o hash: `Senha.create` não re-hasheia, só reidrata o VO.
    const senha = Senha.create(raw.senhaHash);

    if (senha.isLeft()) {
      throw new Error(
        `Hash de senha inválido persistido para o usuário ${raw.id}`,
      );
    }

    return User.create(
      {
        nome: raw.nome,
        email: raw.email,
        senha: senha.value,
        role: ROLE_PARA_DOMINIO[raw.role],
        falhasLogin: raw.falhasLogin,
        primeiraFalhaEm: raw.primeiraFalhaEm,
        bloqueadoAte: raw.bloqueadoAte,
        createdAt: raw.criadoEm,
        updatedAt: raw.atualizadoEm,
      },
      new UniqueEntityId(raw.id),
    );
  }

  static toPrisma(user: User): Prisma.UsuarioUncheckedCreateInput {
    return {
      id: user.id.toString(),
      nome: user.nome,
      email: user.email,
      senhaHash: user.senha.valor,
      role: ROLE_PARA_PRISMA[user.role],
      falhasLogin: user.falhasLogin,
      primeiraFalhaEm: user.primeiraFalhaEm,
      bloqueadoAte: user.bloqueadoAte,
      criadoEm: user.createdAt,
      atualizadoEm: user.updatedAt ?? null,
    };
  }
}
