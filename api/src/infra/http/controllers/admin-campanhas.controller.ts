import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
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

import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { AprovarCampanhaUseCase } from '@domain/fivo/application/use-cases/aprovar-campanha';
import { ListarFilaCampanhasUseCase } from '@domain/fivo/application/use-cases/listar-fila-campanhas';
import { RejeitarCampanhaUseCase } from '@domain/fivo/application/use-cases/rejeitar-campanha';
import { User, UserRole } from '@domain/fivo/entities/user';
import { CurrentUser } from '@infra/auth/decorators/current-user.decorator';
import { Roles } from '@infra/auth/decorators/roles.decorator';
import type { UsuarioAutenticado } from '@infra/auth/usuario-autenticado';

import { rejeicaoSchema } from '../admin-empresas.dto';
import type { RejeicaoDto } from '../admin-empresas.dto';
import { desembrulhar } from '../desembrulhar';
import { ApiErro, ApiProtegida } from '../openapi/decorators';
import { esquemaOpenApi } from '../openapi/esquema-openapi';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

const CORPO_REJEICAO = esquemaOpenApi('RejeicaoCampanha', rejeicaoSchema);

const PARAMETRO_ID = { name: 'id', description: 'Id interno da campanha' };

const DECIMAL = { type: 'string', description: 'String decimal (`"1.50"`)' };

@ApiTags('admin')
@ApiProtegida({ comPapel: true })
@Roles(UserRole.ADMIN)
@Controller('admin/campanhas')
export class AdminCampanhasController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly listarFila: ListarFilaCampanhasUseCase,
    private readonly aprovarCampanha: AprovarCampanhaUseCase,
    private readonly rejeitarCampanha: RejeitarCampanhaUseCase,
  ) {}

  @ApiOperation({
    summary:
      'Fila de campanhas em análise e de alterações pendentes (somente ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Campanhas novas e alterações, da submissão mais antiga para a mais recente. Na alteração, beneficiada, regra e vigência são os valores propostos',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'campanhaId',
          'tipo',
          'empresa',
          'nome',
          'beneficiada',
          'regraDoacao',
          'vigencia',
          'submetidoEm',
        ],
        properties: {
          campanhaId: { type: 'string' },
          tipo: { type: 'string', enum: ['NOVA', 'ALTERACAO'] },
          empresa: { type: 'string', description: 'Nome fantasia' },
          nome: { type: 'string' },
          beneficiada: {
            type: 'object',
            required: ['tipo', 'nome'],
            properties: {
              tipo: { type: 'string', enum: ['INSTITUICAO', 'CAUSA'] },
              nome: { type: 'string' },
            },
          },
          regraDoacao: {
            type: 'object',
            required: ['tipo'],
            properties: {
              tipo: { type: 'string', enum: ['POR_UNIDADE', 'PERCENTUAL'] },
              valor: DECIMAL,
              percentual: DECIMAL,
            },
          },
          vigencia: {
            type: 'object',
            required: ['inicio'],
            properties: {
              inicio: { type: 'string', format: 'date' },
              fim: { type: 'string', format: 'date' },
            },
          },
          submetidoEm: {
            type: 'string',
            format: 'date-time',
            description: 'Submissão da campanha ou abertura da alteração',
          },
        },
      },
    },
  })
  @Get('fila')
  async fila(@CurrentUser() usuario: UsuarioAutenticado) {
    return desembrulhar(
      await this.listarFila.execute({
        user: await this.carregarAdmin(usuario),
      }),
    );
  }

  @ApiOperation({ summary: 'Aprova a campanha em análise (somente ADMIN)' })
  @ApiParam(PARAMETRO_ID)
  @ApiResponse({ status: 204, description: 'Decisão registrada' })
  @ApiErro(404, 'Campanha não encontrada')
  @ApiErro(
    409,
    'Transição inválida, decisão concorrente ou beneficiada fora do catálogo',
  )
  @Post(':id/aprovacao')
  @HttpCode(204)
  async aprovar(
    @Param('id') id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<void> {
    desembrulhar(
      await this.aprovarCampanha.execute(id, await this.carregarAdmin(usuario)),
    );
  }

  @ApiOperation({
    summary: 'Rejeita a campanha em análise com motivo (somente ADMIN)',
  })
  @ApiParam(PARAMETRO_ID)
  @ApiBody({ schema: CORPO_REJEICAO })
  @ApiResponse({
    status: 204,
    description: 'Decisão registrada; a empresa recebe o motivo por e-mail',
  })
  @ApiErro(404, 'Campanha não encontrada')
  @ApiErro(409, 'Transição inválida ou decisão concorrente')
  @ApiErro(422, 'Motivo ausente ou com menos de 20 caracteres')
  @Post(':id/rejeicao')
  @HttpCode(204)
  async rejeitar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejeicaoSchema)) { motivo }: RejeicaoDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<void> {
    desembrulhar(
      await this.rejeitarCampanha.execute(
        id,
        await this.carregarAdmin(usuario),
        motivo,
      ),
    );
  }

  private async carregarAdmin(usuario: UsuarioAutenticado): Promise<User> {
    const user = await this.userRepository.findById(usuario.id);

    if (!user) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    return user;
  }
}
