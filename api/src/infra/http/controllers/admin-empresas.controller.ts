import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { AprovarEmpresaUseCase } from '@domain/fivo/application/use-cases/aprovar-empresa';
import { ListarFilaAprovacaoUseCase } from '@domain/fivo/application/use-cases/listar-fila-aprovacao';
import { ReativarEmpresaUseCase } from '@domain/fivo/application/use-cases/reativar-empresa';
import { RejeitarEmpresaUseCase } from '@domain/fivo/application/use-cases/rejeitar-empresa';
import { SuspenderEmpresaUseCase } from '@domain/fivo/application/use-cases/suspender-empresa';
import { EmpresaStatus } from '@domain/fivo/entities/empresa';
import { User, UserRole } from '@domain/fivo/entities/user';
import { CurrentUser } from '@infra/auth/decorators/current-user.decorator';
import { Roles } from '@infra/auth/decorators/roles.decorator';
import type { UsuarioAutenticado } from '@infra/auth/usuario-autenticado';

import { filaQuerySchema, rejeicaoSchema } from '../admin-empresas.dto';
import type { RejeicaoDto } from '../admin-empresas.dto';
import { desembrulhar } from '../desembrulhar';
import { ApiErro, ApiProtegida } from '../openapi/decorators';
import { esquemaOpenApi } from '../openapi/esquema-openapi';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

const CORPO_REJEICAO = esquemaOpenApi('RejeicaoEmpresa', rejeicaoSchema);

const PARAMETRO_ID = { name: 'id', description: 'Id da empresa' };

@ApiTags('admin')
@ApiProtegida({ comPapel: true })
@Roles(UserRole.ADMIN)
@Controller('admin/empresas')
export class AdminEmpresasController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly listarFila: ListarFilaAprovacaoUseCase,
    private readonly aprovarEmpresa: AprovarEmpresaUseCase,
    private readonly rejeitarEmpresa: RejeitarEmpresaUseCase,
    private readonly suspenderEmpresa: SuspenderEmpresaUseCase,
    private readonly reativarEmpresa: ReativarEmpresaUseCase,
  ) {}

  @ApiOperation({
    summary: 'Fila de empresas pendentes de aprovação (somente ADMIN)',
  })
  @ApiQuery({
    name: 'estado',
    required: false,
    enum: [EmpresaStatus.PENDENTE_APROVACAO],
  })
  @ApiResponse({
    status: 200,
    description: 'Empresas pendentes, da mais antiga para a mais recente',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'razaoSocial', 'cnpj', 'email', 'criadoEm'],
        properties: {
          id: { type: 'string' },
          razaoSocial: { type: 'string' },
          cnpj: { type: 'string' },
          email: { type: 'string' },
          criadoEm: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiErro(422, 'Estado não suportado')
  @Get()
  async listar(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- o pipe só valida o filtro; a fila do caso de uso é sempre PENDENTE_APROVACAO
    @Query(new ZodValidationPipe(filaQuerySchema)) _filtro: unknown,
  ) {
    const fila = await this.listarFila.execute();

    return fila.map(({ createdAt, ...item }) => ({
      ...item,
      criadoEm: createdAt,
    }));
  }

  @ApiOperation({ summary: 'Aprova a empresa (somente ADMIN)' })
  @ApiParam(PARAMETRO_ID)
  @ApiResponse({ status: 204, description: 'Decisão registrada' })
  @ApiErro(404, 'Empresa não encontrada')
  @ApiErro(409, 'Transição de estado inválida para a situação atual')
  @Post(':id/aprovacao')
  @HttpCode(204)
  async aprovar(
    @Param('id') id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<void> {
    desembrulhar(
      await this.aprovarEmpresa.execute(id, await this.carregarAdmin(usuario)),
    );
  }

  @ApiOperation({ summary: 'Rejeita a empresa com motivo (somente ADMIN)' })
  @ApiParam(PARAMETRO_ID)
  @ApiBody({ schema: CORPO_REJEICAO })
  @ApiErro(422, 'Motivo ausente ou insuficiente')
  @ApiResponse({ status: 204, description: 'Decisão registrada' })
  @ApiErro(404, 'Empresa não encontrada')
  @ApiErro(409, 'Transição de estado inválida para a situação atual')
  @Post(':id/rejeicao')
  @HttpCode(204)
  async rejeitar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejeicaoSchema)) { motivo }: RejeicaoDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<void> {
    desembrulhar(
      await this.rejeitarEmpresa.execute(
        id,
        await this.carregarAdmin(usuario),
        motivo,
      ),
    );
  }

  @ApiOperation({ summary: 'Suspende a empresa (somente ADMIN)' })
  @ApiParam(PARAMETRO_ID)
  @ApiResponse({ status: 204, description: 'Decisão registrada' })
  @ApiErro(404, 'Empresa não encontrada')
  @ApiErro(409, 'Transição de estado inválida para a situação atual')
  @Post(':id/suspensao')
  @HttpCode(204)
  async suspender(
    @Param('id') id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<void> {
    desembrulhar(
      await this.suspenderEmpresa.execute(
        id,
        await this.carregarAdmin(usuario),
      ),
    );
  }

  @ApiOperation({ summary: 'Reativa a empresa (somente ADMIN)' })
  @ApiParam(PARAMETRO_ID)
  @ApiResponse({ status: 204, description: 'Decisão registrada' })
  @ApiErro(404, 'Empresa não encontrada')
  @ApiErro(409, 'Transição de estado inválida para a situação atual')
  @Post(':id/reativacao')
  @HttpCode(204)
  async reativar(
    @Param('id') id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<void> {
    desembrulhar(
      await this.reativarEmpresa.execute(id, await this.carregarAdmin(usuario)),
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
