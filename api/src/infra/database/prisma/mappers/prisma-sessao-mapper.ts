import { Prisma, Sessao as SessaoPrisma } from '@prisma/client';

import { Sessao } from '@domain/fivo/application/ports/sessao-repository';

export class PrismaSessaoMapper {
  static toDomain(raw: SessaoPrisma): Sessao {
    return {
      id: raw.id,
      usuarioId: raw.usuarioId,
      tokenHash: raw.tokenHash,
      criadaEm: raw.criadaEm,
      ultimoAcessoEm: raw.ultimoAcessoEm,
      revogadaEm: raw.revogadaEm,
      ip: raw.ip ?? undefined,
      userAgent: raw.userAgent ?? undefined,
    };
  }

  static toPrisma(sessao: Sessao): Prisma.SessaoUncheckedCreateInput {
    return {
      id: sessao.id,
      usuarioId: sessao.usuarioId,
      tokenHash: sessao.tokenHash,
      criadaEm: sessao.criadaEm,
      ultimoAcessoEm: sessao.ultimoAcessoEm,
      revogadaEm: sessao.revogadaEm ?? null,
      ip: sessao.ip ?? null,
      userAgent: sessao.userAgent ?? null,
    };
  }
}
