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

import { UserRepository } from '@domain/fivo/application/ports/database/user-repository';
import { AprovarEmpresaUseCase } from '@domain/fivo/application/use-cases/aprovar-empresa';
import { ListarFilaAprovacaoUseCase } from '@domain/fivo/application/use-cases/listar-fila-aprovacao';
import { ReativarEmpresaUseCase } from '@domain/fivo/application/use-cases/reativar-empresa';
import { RejeitarEmpresaUseCase } from '@domain/fivo/application/use-cases/rejeitar-empresa';
import { SuspenderEmpresaUseCase } from '@domain/fivo/application/use-cases/suspender-empresa';
import { User, UserRole } from '@domain/fivo/entities/user';
import { CurrentUser } from '@infra/auth/current-user.decorator';
import { Roles } from '@infra/auth/roles.decorator';
import type { UsuarioAutenticado } from '@infra/auth/usuario-autenticado';

import { filaQuerySchema, rejeicaoSchema } from './admin-empresas.dto';
import type { RejeicaoDto } from './admin-empresas.dto';
import { desembrulhar } from './desembrulhar';
import { ZodValidationPipe } from './zod-validation.pipe';

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
