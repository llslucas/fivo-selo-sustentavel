import {
  Controller,
  Get,
  Header,
  Logger,
  Res,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { Public } from '@infra/auth/decorators/public.decorator';
import { PrismaService } from '@infra/database/prisma/prisma.service';

import { ApiErro } from '../openapi/decorators';

/**
 * Health check usado pelo Docker, pelo deploy e pelo monitoramento.
 * Responde 200 só se a API alcança o Postgres. A rota é pública (o web a
 * expõe em `/api/health`), então não devolve versão, erro nem detalhe de
 * infraestrutura: a causa de uma falha vai só para o log.
 */
@ApiTags('saude')
@Controller('health')
export class SaudeController {
  private readonly logger = new Logger(SaudeController.name);

  constructor(private readonly prisma: PrismaService) {}

  @ApiOperation({ summary: 'Health check: API no ar e banco acessível' })
  @ApiResponse({
    status: 200,
    description: 'Saudável',
    schema: {
      type: 'object',
      required: ['status'],
      properties: { status: { type: 'string', enum: ['ok'] } },
    },
  })
  @ApiErro(503, 'Banco de dados inacessível')
  @Public()
  @Get()
  @Header('Cache-Control', 'no-store')
  async verificar(
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<{ status: 'ok' }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (erro) {
      this.logger.error(
        `Health check falhou: ${erro instanceof Error ? erro.message : String(erro)}`,
      );
      resposta.setHeader('Cache-Control', 'no-store');
      throw new ServiceUnavailableException('Serviço indisponível');
    }

    return { status: 'ok' };
  }
}
