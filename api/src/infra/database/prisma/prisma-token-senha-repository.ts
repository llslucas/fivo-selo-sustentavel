import { Injectable } from '@nestjs/common';

import {
  TokenSenha,
  TokenSenhaRepository,
} from '@domain/fivo/application/ports/token-senha-repository';

import { PrismaTokenSenhaMapper } from './mappers/prisma-token-senha-mapper';
import { PrismaService } from './prisma.service';

@Injectable()
export class PrismaTokenSenhaRepository implements TokenSenhaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async criar(tokenSenha: TokenSenha): Promise<void> {
    await this.prisma.tokenSenha.create({
      data: PrismaTokenSenhaMapper.toPrisma(tokenSenha),
    });
  }

  async buscarPorHash(hash: string): Promise<TokenSenha | null> {
    const token = await this.prisma.tokenSenha.findUnique({
      where: { tokenHash: hash },
    });

    return token ? PrismaTokenSenhaMapper.toDomain(token) : null;
  }

  async marcarUsado(id: string): Promise<void> {
    await this.prisma.tokenSenha.update({
      where: { id },
      data: { usadoEm: new Date() },
    });
  }
}
