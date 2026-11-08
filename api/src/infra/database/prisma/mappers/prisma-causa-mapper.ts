import {
  Causa as CausaPrisma,
  CausaStatus as CausaStatusPrisma,
  Prisma,
} from '@prisma/client';

import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Causa, CausaStatus } from '@domain/fivo/catalogo/entities/causa';

const STATUS_PARA_PRISMA: Record<CausaStatus, CausaStatusPrisma> = {
  [CausaStatus.ATIVA]: CausaStatusPrisma.ATIVA,
  [CausaStatus.INATIVA]: CausaStatusPrisma.INATIVA,
};

const STATUS_PARA_DOMINIO: Record<CausaStatusPrisma, CausaStatus> = {
  [CausaStatusPrisma.ATIVA]: CausaStatus.ATIVA,
  [CausaStatusPrisma.INATIVA]: CausaStatus.INATIVA,
};

/** Minúsculas e sem acento: "Educação" e "educacao" viram a mesma chave. */
export function normalizarNomeCausa(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export class PrismaCausaMapper {
  static toDomain(raw: CausaPrisma): Causa {
    // O nome persistido já passou pela validação da entidade na criação.
    const causa = Causa.create(
      {
        nome: raw.nome,
        descricao: raw.descricao,
        status: STATUS_PARA_DOMINIO[raw.status],
        createdAt: raw.criadoEm,
        updatedAt: raw.atualizadoEm,
      },
      new UniqueEntityId(raw.id),
    );

    if (causa.isLeft()) {
      throw new Error(`Nome inválido persistido para a causa ${raw.id}`);
    }

    return causa.value;
  }

  static toPrisma(causa: Causa): Prisma.CausaUncheckedCreateInput {
    return {
      id: causa.id.toString(),
      nome: causa.nome,
      nomeBusca: normalizarNomeCausa(causa.nome),
      descricao: causa.descricao,
      status: STATUS_PARA_PRISMA[causa.status],
      criadoEm: causa.createdAt,
      atualizadoEm: causa.updatedAt ?? null,
    };
  }
}
