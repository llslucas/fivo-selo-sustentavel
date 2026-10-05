import { randomUUID } from 'node:crypto';

import {
  MensagemEmail,
  TemplateEmail,
} from '@domain/fivo/application/ports/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '@infra/database/prisma/prisma.service';

import { TransporteEmail } from './transporte-email';

export const MAX_TENTATIVAS = 5;
const BACKOFF_BASE_MS = 60_000;
const RETENCAO_MS = 30 * 24 * 60 * 60 * 1000;

export function atrasoDoBackoff(tentativa: number): number {
  return BACKOFF_BASE_MS * 2 ** (tentativa - 1);
}

@Injectable()
export class EmailPendenteService {
  private readonly logger = new Logger(EmailPendenteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transporte: TransporteEmail,
  ) {}

  async enfileirar(
    mensagem: MensagemEmail,
    agora: Date = new Date(),
  ): Promise<void> {
    await this.prisma.emailPendente.create({
      data: {
        id: randomUUID(),
        para: mensagem.para,
        template: mensagem.template,
        dados:
          (mensagem.dados as Prisma.InputJsonValue | undefined) ?? undefined,
        proximaTentativaEm: new Date(agora.getTime() + atrasoDoBackoff(1)),
        criadoEm: agora,
      },
    });
  }

  /** Reenvia as pendências vencidas; devolve quantas foram entregues. */
  async drenar(agora: Date = new Date()): Promise<number> {
    const vencidas = await this.prisma.emailPendente.findMany({
      where: {
        enviadoEm: null,
        esgotadoEm: null,
        proximaTentativaEm: { lte: agora },
      },
      orderBy: { proximaTentativaEm: 'asc' },
    });

    let entregues = 0;

    for (const pendente of vencidas) {
      const tentativa = pendente.tentativas + 1;

      // Reserva a tentativa antes de enviar: dois workers nunca pegam o mesmo item.
      const { count } = await this.prisma.emailPendente.updateMany({
        where: { id: pendente.id, tentativas: pendente.tentativas },
        data: {
          tentativas: tentativa,
          proximaTentativaEm: new Date(
            agora.getTime() + atrasoDoBackoff(tentativa),
          ),
        },
      });

      if (count === 0) {
        continue;
      }

      try {
        await this.transporte.enviar({
          para: pendente.para,
          template: pendente.template as TemplateEmail,
          dados:
            (pendente.dados as Record<string, unknown> | null) ?? undefined,
        });
        await this.prisma.emailPendente.update({
          where: { id: pendente.id },
          data: { enviadoEm: agora },
        });
        entregues++;
      } catch (erro) {
        this.logger.warn(
          `Reenvio ${tentativa}/${MAX_TENTATIVAS} falhou para ${pendente.template}`,
          erro,
        );

        if (tentativa >= MAX_TENTATIVAS) {
          await this.prisma.emailPendente.update({
            where: { id: pendente.id },
            data: { esgotadoEm: agora },
          });
        }
      }
    }

    return entregues;
  }

  /** Remove linhas enviadas ou esgotadas há mais de 30 dias; pendentes ficam. */
  async expurgar(agora: Date = new Date()): Promise<number> {
    const limite = new Date(agora.getTime() - RETENCAO_MS);
    const { count } = await this.prisma.emailPendente.deleteMany({
      where: {
        OR: [{ enviadoEm: { lt: limite } }, { esgotadoEm: { lt: limite } }],
      },
    });

    return count;
  }
}
