import { Injectable } from '@nestjs/common';

import {
  RegistroAuditoria,
  RegistroAuditoriaRepository,
} from '@domain/fivo/application/ports/registro-auditoria-repository';

import { PrismaRegistroAuditoriaMapper } from './mappers/prisma-registro-auditoria-mapper';
import { PrismaService } from './prisma.service';

/**
 * Append-only por contrato: este adaptador expõe **apenas** `registrar`.
 * Nenhum método de update/delete — o histórico de auditoria não é editável
 * (design.md §Risks; follow-up de infra: `REVOKE UPDATE, DELETE` na tabela).
 */
@Injectable()
export class PrismaRegistroAuditoriaRepository implements RegistroAuditoriaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(registro: RegistroAuditoria): Promise<void> {
    await this.prisma.registroAuditoria.create({
      data: PrismaRegistroAuditoriaMapper.toPrisma(registro),
    });
  }
}
