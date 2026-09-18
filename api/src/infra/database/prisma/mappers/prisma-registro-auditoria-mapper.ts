import {
  Prisma,
  RegistroAuditoria as RegistroAuditoriaPrisma,
} from '@prisma/client';

import { RegistroAuditoria } from '@domain/fivo/application/ports/registro-auditoria-repository';

export class PrismaRegistroAuditoriaMapper {
  static toDomain(raw: RegistroAuditoriaPrisma): RegistroAuditoria {
    return {
      id: raw.id,
      tipo: raw.tipo,
      descricao: raw.descricao,
      usuarioId: raw.usuarioId,
      entidadeId: raw.entidadeId,
      dados: (raw.dados as Record<string, unknown> | null) ?? null,
      criadoEm: raw.criadoEm,
    };
  }

  static toPrisma(
    registro: RegistroAuditoria,
  ): Prisma.RegistroAuditoriaUncheckedCreateInput {
    return {
      id: registro.id,
      tipo: registro.tipo,
      descricao: registro.descricao,
      usuarioId: registro.usuarioId ?? null,
      entidadeId: registro.entidadeId ?? null,
      dados: registro.dados
        ? (registro.dados as Prisma.InputJsonObject)
        : Prisma.DbNull,
      criadoEm: registro.criadoEm,
    };
  }
}
