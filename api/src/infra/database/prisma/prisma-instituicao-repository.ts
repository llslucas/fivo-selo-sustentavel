import { Injectable } from '@nestjs/common';
import {
  InstituicaoStatus as InstituicaoStatusPrisma,
  Prisma,
} from '@prisma/client';

import { InstituicaoAlreadyExistsError } from '@domain/fivo/application/errors/instituicao-already-exists.error';
import {
  InstituicaoRepository,
  OrdenacaoListaInstituicao,
} from '@domain/fivo/application/ports/database/instituicao-repository';
import {
  Instituicao,
  InstituicaoStatus,
} from '@domain/fivo/entities/instituicao';

import { ehViolacaoDeUnicidade } from './erros-prisma';
import {
  PrismaInstituicaoMapper,
  statusInstituicaoParaPrisma,
} from './mappers/prisma-instituicao-mapper';
import { PrismaTransactionContext } from './prisma-transaction-context';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaInstituicaoRepository implements InstituicaoRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: PrismaTransactionContext,
  ) {}

  private get db(): Prisma.TransactionClient {
    return this.contexto.atual() ?? this.prisma;
  }

  async findById(id: string): Promise<Instituicao | null> {
    const instituicao = await this.prisma.instituicao.findUnique({
      where: { id },
    });

    return instituicao ? PrismaInstituicaoMapper.toDomain(instituicao) : null;
  }

  async findByCnpj(cnpj: string): Promise<Instituicao | null> {
    const instituicao = await this.prisma.instituicao.findUnique({
      where: { cnpj },
    });

    return instituicao ? PrismaInstituicaoMapper.toDomain(instituicao) : null;
  }

  async findByUsuarioId(usuarioId: string): Promise<Instituicao | null> {
    const instituicao = await this.prisma.instituicao.findUnique({
      where: { usuarioId },
    });

    return instituicao ? PrismaInstituicaoMapper.toDomain(instituicao) : null;
  }

  async listarPorEstado(
    estado: InstituicaoStatus,
    ordem: OrdenacaoListaInstituicao,
  ): Promise<Instituicao[]> {
    const instituicoes = await this.prisma.instituicao.findMany({
      where: { status: statusInstituicaoParaPrisma(estado) },
      orderBy: { criadoEm: ordem },
    });

    return instituicoes.map((instituicao) =>
      PrismaInstituicaoMapper.toDomain(instituicao),
    );
  }

  async listarAprovadasPorCausa(
    causaId: string,
    ordem: OrdenacaoListaInstituicao,
  ): Promise<Instituicao[]> {
    const instituicoes = await this.prisma.instituicao.findMany({
      where: { causaId, status: InstituicaoStatusPrisma.APROVADA },
      orderBy: { criadoEm: ordem },
    });

    return instituicoes.map((instituicao) =>
      PrismaInstituicaoMapper.toDomain(instituicao),
    );
  }

  async create(instituicao: Instituicao): Promise<void> {
    try {
      await this.db.instituicao.create({
        data: PrismaInstituicaoMapper.toPrisma(instituicao),
      });
    } catch (erro) {
      // Corrida entre a checagem de unicidade do caso de uso e o INSERT:
      // o índice único de CNPJ vira o mesmo erro de domínio (409).
      if (ehViolacaoDeUnicidade(erro)) {
        throw new InstituicaoAlreadyExistsError();
      }

      throw erro;
    }
  }

  async save(instituicao: Instituicao): Promise<void> {
    try {
      // Estado e decisão só mudam por `salvarTransicao`: regravá-los aqui, a
      // partir de uma leitura obsoleta, desfaria a decisão de um admin.
      const { status, decididoPor, decididoEm, motivoDecisao, ...cadastrais } =
        PrismaInstituicaoMapper.toPrisma(instituicao);
      void [status, decididoPor, decididoEm, motivoDecisao];

      await this.db.instituicao.update({
        where: { id: instituicao.id.toString() },
        data: cadastrais,
      });
    } catch (erro) {
      if (ehViolacaoDeUnicidade(erro)) {
        throw new InstituicaoAlreadyExistsError();
      }

      throw erro;
    }
  }

  async salvarTransicao(
    instituicao: Instituicao,
    estadoEsperado: InstituicaoStatus,
  ): Promise<boolean> {
    // CAS: o UPDATE só casa se o estado persistido ainda for o esperado; se
    // outra decisão venceu, nenhuma linha é afetada.
    const { count } = await this.db.instituicao.updateMany({
      where: {
        id: instituicao.id.toString(),
        status: statusInstituicaoParaPrisma(estadoEsperado),
      },
      data: PrismaInstituicaoMapper.toPrisma(instituicao),
    });

    return count === 1;
  }
}
