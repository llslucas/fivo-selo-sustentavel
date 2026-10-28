import { Injectable } from '@nestjs/common';
import {
  AlteracaoCampanhaStatus as AlteracaoStatusPrisma,
  CampanhaStatus as CampanhaStatusPrisma,
  Prisma,
} from '@prisma/client';

import { CampanhaRepository } from '@domain/fivo/application/ports/database/campanha-repository';
import { Campanha } from '@domain/fivo/entities/campanha';

import { PrismaCampanhaMapper } from './mappers/prisma-campanha-mapper';
import { PrismaTransactionContext } from './prisma-transaction-context';
import { PrismaService } from './prisma.service';

// Só a alteração em análise volta ao agregado; as decididas são histórico.
const COM_ALTERACAO_PENDENTE = {
  alteracoes: { where: { status: AlteracaoStatusPrisma.EM_ANALISE } },
} satisfies Prisma.CampanhaInclude;

@Injectable()
export class PrismaCampanhaRepository implements CampanhaRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: PrismaTransactionContext,
  ) {}

  async findById(id: string): Promise<Campanha | null> {
    const campanha = await this.prisma.campanha.findUnique({
      where: { id },
      include: COM_ALTERACAO_PENDENTE,
    });

    return campanha ? PrismaCampanhaMapper.toDomain(campanha) : null;
  }

  async findByIdPublico(idPublico: string): Promise<Campanha | null> {
    const campanha = await this.prisma.campanha.findUnique({
      where: { idPublico },
      include: COM_ALTERACAO_PENDENTE,
    });

    return campanha ? PrismaCampanhaMapper.toDomain(campanha) : null;
  }

  async create(campanha: Campanha): Promise<void> {
    const pendente = campanha.alteracaoPendente;

    await this.emTransacao(async (db) => {
      await db.campanha.create({
        data: PrismaCampanhaMapper.toPrisma(campanha),
      });

      if (pendente) {
        await db.campanhaAlteracao.create({
          data: PrismaCampanhaMapper.alteracaoToPrisma(pendente),
        });
      }
    });
  }

  salvar(campanha: Campanha, versaoEsperada: number): Promise<boolean> {
    const { id, ...colunas } = PrismaCampanhaMapper.toPrisma(campanha);
    const decidida = campanha.alteracaoDecidida;
    const pendente = campanha.alteracaoPendente;

    return this.emTransacao(async (db) => {
      // CAS: o UPDATE só casa se ninguém gravou depois da leitura. Sem linha
      // afetada, nada mais é gravado.
      const { count } = await db.campanha.updateMany({
        where: { id, versao: versaoEsperada },
        data: { ...colunas, versao: versaoEsperada + 1 },
      });

      if (count === 0) {
        return false;
      }

      // A decisão vai antes da pendente: tira a linha decidida do índice
      // parcial "uma alteração EM_ANALISE por campanha" antes de uma nova
      // pendente entrar. Upsert pelo `id`, como o double: salvar de novo a
      // mesma instância não duplica nem perde a decisão.
      if (decidida) {
        const linha = PrismaCampanhaMapper.alteracaoToPrisma(decidida);

        await db.campanhaAlteracao.upsert({
          where: { id: linha.id },
          create: linha,
          update: {
            status: linha.status,
            decididoPor: linha.decididoPor,
            decididoEm: linha.decididoEm,
            motivo: linha.motivo,
          },
        });
      }

      if (pendente) {
        const { id: alteracaoId, ...linha } =
          PrismaCampanhaMapper.alteracaoToPrisma(pendente);

        await db.campanhaAlteracao.upsert({
          where: { id: alteracaoId },
          create: { id: alteracaoId, ...linha },
          update: linha,
        });
      }

      return true;
    });
  }

  async listarEmAnalise(): Promise<Campanha[]> {
    const campanhas = await this.prisma.campanha.findMany({
      where: {
        OR: [
          { status: CampanhaStatusPrisma.EM_ANALISE },
          {
            status: CampanhaStatusPrisma.APROVADA,
            alteracoes: { some: { status: AlteracaoStatusPrisma.EM_ANALISE } },
          },
        ],
      },
      include: COM_ALTERACAO_PENDENTE,
      orderBy: { criadoEm: 'asc' },
    });

    return campanhas.map((campanha) => PrismaCampanhaMapper.toDomain(campanha));
  }

  // Reaproveita a transação do `UnitOfWork`, se houver; senão abre uma.
  private emTransacao<T>(
    job: (db: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    const atual = this.contexto.atual();

    if (atual) {
      return job(atual);
    }

    return this.prisma.$transaction((cliente) => job(cliente));
  }
}
