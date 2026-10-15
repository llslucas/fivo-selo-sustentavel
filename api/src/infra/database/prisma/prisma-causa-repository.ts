import { Injectable } from '@nestjs/common';
import { CausaStatus as CausaStatusPrisma, Prisma } from '@prisma/client';

import { CausaJaExisteError } from '@domain/fivo/application/errors/causa-ja-existe.error';
import { CausaRepository } from '@domain/fivo/application/ports/database/causa-repository';
import { Causa } from '@domain/fivo/entities/causa';

import { ehViolacaoDeUnicidade } from './erros-prisma';
import {
  normalizarNomeCausa,
  PrismaCausaMapper,
} from './mappers/prisma-causa-mapper';
import { PrismaTransactionContext } from './prisma-transaction-context';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaCausaRepository implements CausaRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: PrismaTransactionContext,
  ) {}

  private get db(): Prisma.TransactionClient {
    return this.contexto.atual() ?? this.prisma;
  }

  async findById(id: string): Promise<Causa | null> {
    const causa = await this.prisma.causa.findUnique({ where: { id } });

    return causa ? PrismaCausaMapper.toDomain(causa) : null;
  }

  async findByNome(nome: string): Promise<Causa | null> {
    // Compara pela coluna derivada, então caixa e acento não contam.
    const causa = await this.prisma.causa.findUnique({
      where: { nomeBusca: normalizarNomeCausa(nome) },
    });

    return causa ? PrismaCausaMapper.toDomain(causa) : null;
  }

  async listarAtivas(): Promise<Causa[]> {
    const causas = await this.prisma.causa.findMany({
      where: { status: CausaStatusPrisma.ATIVA },
    });

    return causas.map((causa) => PrismaCausaMapper.toDomain(causa));
  }

  async create(causa: Causa): Promise<void> {
    try {
      await this.db.causa.create({ data: PrismaCausaMapper.toPrisma(causa) });
    } catch (erro) {
      // Corrida entre o `findByNome` do caso de uso e o INSERT: o índice
      // único de `nome_busca` vira o mesmo erro de domínio (409).
      if (ehViolacaoDeUnicidade(erro)) {
        throw new CausaJaExisteError();
      }

      throw erro;
    }
  }

  async save(causa: Causa): Promise<void> {
    try {
      await this.db.causa.update({
        where: { id: causa.id.toString() },
        data: PrismaCausaMapper.toPrisma(causa),
      });
    } catch (erro) {
      if (ehViolacaoDeUnicidade(erro)) {
        throw new CausaJaExisteError();
      }

      throw erro;
    }
  }
}
