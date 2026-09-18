import { Prisma, TokenSenha as TokenSenhaPrisma } from '@prisma/client';

import { TokenSenha } from '@domain/fivo/application/ports/token-senha-repository';

export class PrismaTokenSenhaMapper {
  static toDomain(raw: TokenSenhaPrisma): TokenSenha {
    return {
      id: raw.id,
      usuarioId: raw.usuarioId,
      tokenHash: raw.tokenHash,
      criadoEm: raw.criadoEm,
      expiraEm: raw.expiraEm,
      usadoEm: raw.usadoEm,
    };
  }

  static toPrisma(token: TokenSenha): Prisma.TokenSenhaUncheckedCreateInput {
    return {
      id: token.id,
      usuarioId: token.usuarioId,
      tokenHash: token.tokenHash,
      criadoEm: token.criadoEm,
      expiraEm: token.expiraEm,
      usadoEm: token.usadoEm ?? null,
    };
  }
}
