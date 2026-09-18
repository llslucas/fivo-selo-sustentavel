import { Injectable } from '@nestjs/common';

import {
  Sessao,
  SessaoRepository,
} from '@domain/fivo/application/ports/sessao-repository';

import { PrismaSessaoMapper } from './mappers/prisma-sessao-mapper';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaSessaoRepository implements SessaoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(sessao: Sessao): Promise<void> {
    await this.prisma.sessao.create({
      data: PrismaSessaoMapper.toPrisma(sessao),
    });
  }

  async buscarPorTokenHash(hash: string): Promise<Sessao | null> {
    const sessao = await this.prisma.sessao.findUnique({
      where: { tokenHash: hash },
    });

    return sessao ? PrismaSessaoMapper.toDomain(sessao) : null;
  }

  async deslizar(id: string, agora: Date): Promise<void> {
    await this.prisma.sessao.update({
      where: { id },
      data: { ultimoAcessoEm: agora },
    });
  }

  async revogar(id: string): Promise<void> {
    await this.prisma.sessao.update({
      where: { id },
      data: { revogadaEm: new Date() },
    });
  }

  async revogarTodasDoUsuario(usuarioId: string): Promise<void> {
    await this.prisma.sessao.updateMany({
      where: { usuarioId, revogadaEm: null },
      data: { revogadaEm: new Date() },
    });
  }
}
