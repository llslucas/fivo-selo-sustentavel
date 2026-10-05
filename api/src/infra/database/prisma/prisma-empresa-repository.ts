import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { EmpresaAlreadyExistsError } from '@domain/fivo/application/errors/empresa-already-exists.error';
import {
  EmpresaRepository,
  OrdenacaoListaEmpresa,
} from '@domain/fivo/application/ports/database/empresa-repository';
import { Empresa } from '@domain/fivo/entities/empresa';

import { ehViolacaoDeUnicidade } from './erros-prisma';
import {
  PrismaEmpresaMapper,
  statusParaPrisma,
} from './mappers/prisma-empresa-mapper';
import { PrismaTransactionContext } from './prisma-transaction-context';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaEmpresaRepository implements EmpresaRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly contexto: PrismaTransactionContext,
  ) {}

  private get db(): Prisma.TransactionClient {
    return this.contexto.atual() ?? this.prisma;
  }

  async findById(id: string): Promise<Empresa | null> {
    const empresa = await this.prisma.empresa.findUnique({ where: { id } });

    return empresa ? PrismaEmpresaMapper.toDomain(empresa) : null;
  }

  async findByCnpj(cnpj: string): Promise<Empresa | null> {
    const empresa = await this.prisma.empresa.findUnique({ where: { cnpj } });

    return empresa ? PrismaEmpresaMapper.toDomain(empresa) : null;
  }

  async findByUsuarioId(usuarioId: string): Promise<Empresa | null> {
    const empresa = await this.prisma.empresa.findUnique({
      where: { usuarioId },
    });

    return empresa ? PrismaEmpresaMapper.toDomain(empresa) : null;
  }

  async findByTokenTrocaEmailHash(hash: string): Promise<Empresa | null> {
    const empresa = await this.prisma.empresa.findFirst({
      where: { tokenTrocaEmailHash: hash },
    });

    return empresa ? PrismaEmpresaMapper.toDomain(empresa) : null;
  }

  async listarPorEstado(
    estado: string,
    ordem: OrdenacaoListaEmpresa,
  ): Promise<Empresa[]> {
    const empresas = await this.prisma.empresa.findMany({
      where: { status: statusParaPrisma(estado) },
      orderBy: { criadoEm: ordem },
    });

    return empresas.map((empresa) => PrismaEmpresaMapper.toDomain(empresa));
  }

  async create(empresa: Empresa): Promise<void> {
    try {
      await this.db.empresa.create({
        data: PrismaEmpresaMapper.toPrisma(empresa),
      });
    } catch (erro) {
      // Corrida entre a checagem de unicidade do caso de uso e o INSERT:
      // o erro do banco vira o mesmo erro de domínio (409).
      if (ehViolacaoDeUnicidade(erro)) {
        throw new EmpresaAlreadyExistsError();
      }

      throw erro;
    }
  }

  async save(empresa: Empresa): Promise<void> {
    try {
      // Estado e decisão só mudam por `salvarTransicao`: regravá-los aqui, a
      // partir de uma leitura obsoleta, desfaria a decisão de um admin.
      const {
        status,
        decididoPor,
        decididoEm,
        motivoDecisao,
        emailPendente,
        tokenTrocaEmailHash,
        tokenTrocaEmailExpiraEm,
        ...cadastrais
      } = PrismaEmpresaMapper.toPrisma(empresa);
      void [
        status,
        decididoPor,
        decididoEm,
        motivoDecisao,
        emailPendente,
        tokenTrocaEmailHash,
        tokenTrocaEmailExpiraEm,
      ];

      await this.db.empresa.update({
        where: { id: empresa.id.toString() },
        data: cadastrais,
      });
    } catch (erro) {
      if (ehViolacaoDeUnicidade(erro)) {
        throw new EmpresaAlreadyExistsError();
      }

      throw erro;
    }
  }

  async salvarTrocaDeEmail(empresa: Empresa): Promise<void> {
    const { emailPendente, tokenTrocaEmailHash, tokenTrocaEmailExpiraEm } =
      PrismaEmpresaMapper.toPrisma(empresa);

    await this.db.empresa.update({
      where: { id: empresa.id.toString() },
      data: { emailPendente, tokenTrocaEmailHash, tokenTrocaEmailExpiraEm },
    });
  }

  async salvarTransicao(
    empresa: Empresa,
    estadoEsperado: string,
  ): Promise<boolean> {
    const { count } = await this.db.empresa.updateMany({
      where: {
        id: empresa.id.toString(),
        status: statusParaPrisma(estadoEsperado),
      },
      data: PrismaEmpresaMapper.toPrisma(empresa),
    });

    return count === 1;
  }
}
