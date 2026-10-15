import {
  Body,
  ConflictException,
  Controller,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { z } from 'zod';

import { CausaComInstituicoesAprovadasError } from '@domain/fivo/application/errors/causa-com-instituicoes-aprovadas.error';
import { CausaRepository } from '@domain/fivo/application/ports/database/causa-repository';
import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { CriarCausaUseCase } from '@domain/fivo/application/use-cases/criar-causa';
import { EditarCausaUseCase } from '@domain/fivo/application/use-cases/editar-causa';
import { InativarCausaUseCase } from '@domain/fivo/application/use-cases/inativar-causa';
import { User, UserRole } from '@domain/fivo/entities/user';
import { CurrentUser } from '@infra/auth/decorators/current-user.decorator';
import { Roles } from '@infra/auth/decorators/roles.decorator';
import type { UsuarioAutenticado } from '@infra/auth/usuario-autenticado';

import { criarCausaSchema, editarCausaSchema } from '../admin-causas.dto';
import type { CriarCausaDto, EditarCausaDto } from '../admin-causas.dto';
import { causaParaResposta } from '../causa.presenter';
import { desembrulhar } from '../desembrulhar';
import { ApiErro, ApiProtegida } from '../openapi/decorators';
import { erroRespostaSchema, esquemaOpenApi } from '../openapi/esquema-openapi';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

const CORPO_CRIAR_CAUSA = esquemaOpenApi('CriarCausa', criarCausaSchema);
const CORPO_EDITAR_CAUSA = esquemaOpenApi('EditarCausa', editarCausaSchema);

// 409 da inativação: `instituicoes` vem só quando há aprovadas vinculadas
// (INST-07 AC4), para o painel listar quem precisa ser inativada antes.
const ERRO_INATIVACAO_CAUSA = esquemaOpenApi(
  'ErroInativacaoCausa',
  erroRespostaSchema.extend({ instituicoes: z.array(z.string()).optional() }),
);

const RESPOSTA_CAUSA = {
  type: 'object',
  required: ['id', 'nome', 'descricao', 'status'],
  properties: {
    id: { type: 'string' },
    nome: { type: 'string' },
    descricao: { type: 'string' },
    status: { type: 'string', enum: ['ATIVA', 'INATIVA'] },
  },
};

const PARAMETRO_ID = { name: 'id', description: 'Id da causa' };

@ApiTags('admin')
@ApiProtegida({ comPapel: true })
@Roles(UserRole.ADMIN)
@Controller('admin/causas')
export class AdminCausasController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly causaRepository: CausaRepository,
    private readonly criarCausa: CriarCausaUseCase,
    private readonly editarCausa: EditarCausaUseCase,
    private readonly inativarCausa: InativarCausaUseCase,
  ) {}

  @ApiOperation({ summary: 'Cria uma causa ATIVA (somente ADMIN)' })
  @ApiBody({ schema: CORPO_CRIAR_CAUSA })
  @ApiResponse({
    status: 201,
    description: 'Causa criada',
    schema: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'string' } },
    },
  })
  @ApiErro(409, 'Causa já cadastrada')
  @ApiErro(422, 'Dados inválidos')
  @Post()
  async criar(
    @Body(new ZodValidationPipe(criarCausaSchema)) dados: CriarCausaDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<{ id: string }> {
    const { causaId } = desembrulhar(
      await this.criarCausa.execute({
        ...dados,
        user: await this.carregarAdmin(usuario),
      }),
    );

    return { id: causaId };
  }

  @ApiOperation({ summary: 'Edita nome e descrição da causa (somente ADMIN)' })
  @ApiParam(PARAMETRO_ID)
  @ApiBody({ schema: CORPO_EDITAR_CAUSA })
  @ApiResponse({
    status: 200,
    description: 'Causa atualizada',
    schema: RESPOSTA_CAUSA,
  })
  @ApiErro(404, 'Causa não encontrada')
  @ApiErro(409, 'Causa já cadastrada, ou causa inativa')
  @ApiErro(422, 'Dados inválidos')
  @Patch(':id')
  async editar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(editarCausaSchema)) dados: EditarCausaDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    desembrulhar(
      await this.editarCausa.execute({
        causaId: id,
        ...dados,
        user: await this.carregarAdmin(usuario),
      }),
    );

    const causa = await this.causaRepository.findById(id);

    if (!causa) {
      throw new NotFoundException('Causa não encontrada');
    }

    return causaParaResposta(causa);
  }

  @ApiOperation({ summary: 'Inativa a causa (somente ADMIN)' })
  @ApiParam(PARAMETRO_ID)
  @ApiResponse({ status: 204, description: 'Causa inativada' })
  @ApiErro(404, 'Causa não encontrada')
  @ApiResponse({
    status: 409,
    description:
      'Causa já inativa, ou com instituições aprovadas vinculadas (listadas em `instituicoes`)',
    schema: ERRO_INATIVACAO_CAUSA,
  })
  @Post(':id/inativacao')
  @HttpCode(204)
  async inativar(
    @Param('id') id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<void> {
    const resultado = await this.inativarCausa.execute({
      causaId: id,
      user: await this.carregarAdmin(usuario),
    });

    if (
      resultado.isLeft() &&
      resultado.value instanceof CausaComInstituicoesAprovadasError
    ) {
      throw new ConflictException({
        statusCode: 409,
        message: resultado.value.message,
        instituicoes: resultado.value.instituicoes,
      });
    }

    desembrulhar(resultado);
  }

  private async carregarAdmin(usuario: UsuarioAutenticado): Promise<User> {
    const user = await this.userRepository.findById(usuario.id);

    if (!user) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    return user;
  }
}
