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
import { AprovarInstituicaoUseCase } from '@domain/fivo/application/use-cases/aprovar-instituicao';
import { InativarInstituicaoUseCase } from '@domain/fivo/application/use-cases/inativar-instituicao';
import { ListarFilaInstituicoesUseCase } from '@domain/fivo/application/use-cases/listar-fila-instituicoes';
import { ReativarInstituicaoUseCase } from '@domain/fivo/application/use-cases/reativar-instituicao';
import { RejeitarInstituicaoUseCase } from '@domain/fivo/application/use-cases/rejeitar-instituicao';
import { SuspenderInstituicaoUseCase } from '@domain/fivo/application/use-cases/suspender-instituicao';
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

const CORPO_REJEICAO = esquemaOpenApi('RejeicaoInstituicao', rejeicaoSchema);

const PARAMETRO_ID = { name: 'id', description: 'Id da instituição' };

@ApiTags('admin')
@ApiProtegida({ comPapel: true })
@Roles(UserRole.ADMIN)
@Controller('admin/instituicoes')
export class AdminInstituicoesController {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly listarFila: ListarFilaInstituicoesUseCase,
    private readonly aprovarInstituicao: AprovarInstituicaoUseCase,
    private readonly rejeitarInstituicao: RejeitarInstituicaoUseCase,
    private readonly suspenderInstituicao: SuspenderInstituicaoUseCase,
    private readonly reativarInstituicao: ReativarInstituicaoUseCase,
    private readonly inativarInstituicao: InativarInstituicaoUseCase,
  ) {}

  @ApiOperation({
    summary: 'Fila de instituições pendentes de aprovação (somente ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Instituições pendentes, da mais antiga para a mais recente. O documento é baixado em `GET /arquivos/{documentoArquivoId}`',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        required: [
          'id',
          'razaoSocial',
          'cnpj',
          'causa',
          'cidade',
          'uf',
          'email',
          'documentoArquivoId',
          'cnpjCoincideComEmpresa',
          'criadoEm',
        ],
        properties: {
          id: { type: 'string' },
          razaoSocial: { type: 'string' },
          cnpj: { type: 'string' },
          causa: { type: 'string', description: 'Nome da causa' },
          cidade: { type: 'string' },
          uf: { type: 'string' },
          email: { type: 'string' },
          documentoArquivoId: { type: 'string' },
          cnpjCoincideComEmpresa: {
            type: 'boolean',
            description: 'Já existe empresa cadastrada com o mesmo CNPJ',
          },
          criadoEm: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @Get()
  async listar(@CurrentUser() usuario: UsuarioAutenticado) {
    const fila = desembrulhar(
      await this.listarFila.execute({
        user: await this.carregarAdmin(usuario),
      }),
    );

    return fila.map(({ createdAt, ...item }) => ({
      ...item,
      criadoEm: createdAt,
    }));
  }

  @ApiOperation({ summary: 'Aprova a instituição (somente ADMIN)' })
  @ApiParam(PARAMETRO_ID)
  @ApiResponse({ status: 204, description: 'Decisão registrada' })
  @ApiErro(404, 'Instituição não encontrada')
  @ApiErro(409, 'Transição de estado inválida para a situação atual')
  @ApiErro(503, 'Documento de validação temporariamente indisponível')
  @Post(':id/aprovacao')
  @HttpCode(204)
  async aprovar(
    @Param('id') id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<void> {
    desembrulhar(
      await this.aprovarInstituicao.execute(
        id,
        await this.carregarAdmin(usuario),
      ),
    );
  }

  @ApiOperation({
    summary: 'Rejeita a instituição com motivo (somente ADMIN)',
  })
  @ApiParam(PARAMETRO_ID)
  @ApiBody({ schema: CORPO_REJEICAO })
  @ApiResponse({ status: 204, description: 'Decisão registrada' })
  @ApiErro(404, 'Instituição não encontrada')
  @ApiErro(409, 'Transição de estado inválida para a situação atual')
  @ApiErro(422, 'Motivo ausente ou insuficiente')
  @Post(':id/rejeicao')
  @HttpCode(204)
  async rejeitar(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(rejeicaoSchema)) { motivo }: RejeicaoDto,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<void> {
    desembrulhar(
      await this.rejeitarInstituicao.execute(
        id,
        await this.carregarAdmin(usuario),
        motivo,
      ),
    );
  }

  @ApiOperation({
    summary: 'Suspende a instituição aprovada (somente ADMIN)',
  })
  @ApiParam(PARAMETRO_ID)
  @ApiResponse({ status: 204, description: 'Decisão registrada' })
  @ApiErro(404, 'Instituição não encontrada')
  @ApiErro(409, 'Transição de estado inválida para a situação atual')
  @Post(':id/suspensao')
  @HttpCode(204)
  async suspender(
    @Param('id') id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<void> {
    desembrulhar(
      await this.suspenderInstituicao.execute(
        id,
        await this.carregarAdmin(usuario),
      ),
    );
  }

  @ApiOperation({
    summary: 'Reativa a instituição suspensa (somente ADMIN)',
  })
  @ApiParam(PARAMETRO_ID)
  @ApiResponse({ status: 204, description: 'Decisão registrada' })
  @ApiErro(404, 'Instituição não encontrada')
  @ApiErro(409, 'Transição de estado inválida para a situação atual')
  @Post(':id/reativacao')
  @HttpCode(204)
  async reativar(
    @Param('id') id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<void> {
    desembrulhar(
      await this.reativarInstituicao.execute(
        id,
        await this.carregarAdmin(usuario),
      ),
    );
  }

  @ApiOperation({
    summary: 'Inativa a instituição aprovada, sem excluir (somente ADMIN)',
  })
  @ApiParam(PARAMETRO_ID)
  @ApiResponse({ status: 204, description: 'Decisão registrada' })
  @ApiErro(404, 'Instituição não encontrada')
  @ApiErro(409, 'Transição de estado inválida para a situação atual')
  @Post(':id/inativacao')
  @HttpCode(204)
  async inativar(
    @Param('id') id: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ): Promise<void> {
    desembrulhar(
      await this.inativarInstituicao.execute(
        id,
        await this.carregarAdmin(usuario),
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
