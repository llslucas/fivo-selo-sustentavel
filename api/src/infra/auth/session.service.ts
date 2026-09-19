import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { SessaoRepository } from '@domain/fivo/application/ports/sessao-repository';
import { GeradorTokenOpaco } from '@infra/cryptography/gerador-token-opaco';

import { INATIVIDADE_MAXIMA_MS } from './auth.constants';
import { UsuarioAutenticado } from './usuario-autenticado';

export interface ContextoDeSessao {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly sessaoRepository: SessaoRepository,
    private readonly userRepository: UserRepository,
    private readonly geradorToken: GeradorTokenOpaco,
  ) {}

  async criar(
    usuarioId: string,
    contexto: ContextoDeSessao = {},
    agora: Date = new Date(),
  ): Promise<{ token: string }> {
    const token = this.geradorToken.gerar();

    await this.sessaoRepository.criar({
      id: randomUUID(),
      usuarioId,
      tokenHash: this.geradorToken.sha256(token),
      criadaEm: agora,
      ultimoAcessoEm: agora,
      ip: contexto.ip,
      userAgent: contexto.userAgent,
    });

    return { token };
  }

  async validar(
    tokenCru: string,
    agora: Date = new Date(),
  ): Promise<UsuarioAutenticado | null> {
    const sessao = await this.sessaoRepository.buscarPorTokenHash(
      this.geradorToken.sha256(tokenCru),
    );

    if (!sessao || sessao.revogadaEm) {
      return null;
    }

    if (
      agora.getTime() - sessao.ultimoAcessoEm.getTime() >
      INATIVIDADE_MAXIMA_MS
    ) {
      await this.sessaoRepository.revogar(sessao.id);
      return null;
    }

    const user = await this.userRepository.findById(sessao.usuarioId);

    if (!user) {
      return null;
    }

    await this.sessaoRepository.deslizar(sessao.id, agora);

    return { id: user.id.toString(), role: user.role, sessaoId: sessao.id };
  }

  revogar(sessaoId: string): Promise<void> {
    return this.sessaoRepository.revogar(sessaoId);
  }

  revogarTodasDoUsuario(usuarioId: string): Promise<void> {
    return this.sessaoRepository.revogarTodasDoUsuario(usuarioId);
  }
}
