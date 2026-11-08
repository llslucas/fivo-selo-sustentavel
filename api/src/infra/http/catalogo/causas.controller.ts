import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { ListarCausasAtivasUseCase } from '@domain/fivo/catalogo/use-cases/listar-causas-ativas';
import { Public } from '@infra/auth/decorators/public.decorator';

import { causaAtivaParaResposta } from './causa.presenter';

@ApiTags('causas')
@Controller('causas')
export class CausasController {
  constructor(private readonly listarCausasAtivas: ListarCausasAtivasUseCase) {}

  @ApiOperation({
    summary: 'Causas ativas, para o autocadastro e a seleção de beneficiada',
  })
  @ApiResponse({
    status: 200,
    description: 'Causas ATIVA em ordem alfabética de nome',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'nome', 'descricao'],
        properties: {
          id: { type: 'string' },
          nome: { type: 'string' },
          descricao: { type: 'string' },
        },
      },
    },
  })
  @Public()
  @Get()
  async listar() {
    const causas = await this.listarCausasAtivas.execute();

    return causas.map(causaAtivaParaResposta);
  }
}
