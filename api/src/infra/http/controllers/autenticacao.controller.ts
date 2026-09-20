import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { AutenticarUsuarioUseCase } from '@domain/fivo/application/use-cases/autenticar-usuario';
import { UserRole } from '@domain/fivo/entities/user';
import { CurrentUser } from '@infra/auth/decorators/current-user.decorator';
import { Public } from '@infra/auth/decorators/public.decorator';
import {
  definirCookieDeSessao,
  limparCookieDeSessao,
} from '@infra/auth/session-cookie';
import { SessionService } from '@infra/auth/session.service';
import type { UsuarioAutenticado } from '@infra/auth/usuario-autenticado';

import { loginSchema } from '../autenticacao.dto';
import type { LoginDto } from '../autenticacao.dto';
import { desembrulhar } from '../desembrulhar';
import { ApiErro, ApiProtegida } from '../openapi/decorators';
import { esquemaOpenApi } from '../openapi/esquema-openapi';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';

const CORPO_LOGIN = esquemaOpenApi('Login', loginSchema);

@ApiTags('sessoes')
@Controller('sessoes')
export class AutenticacaoController {
  constructor(
    private readonly autenticarUsuario: AutenticarUsuarioUseCase,
    private readonly sessionService: SessionService,
  ) {}

  @ApiOperation({ summary: 'Abre a sessão (login) e define o cookie' })
  @ApiBody({ schema: CORPO_LOGIN })
  @ApiResponse({
    status: 200,
    description: 'Sessão aberta',
    headers: {
      'Set-Cookie': {
        description: 'Cookie de sessão opaca (HttpOnly)',
        schema: { type: 'string' },
      },
    },
    schema: {
      type: 'object',
      required: ['papel'],
      properties: { papel: { type: 'string', enum: Object.values(UserRole) } },
    },
  })
  @ApiErro(401, 'Credenciais inválidas')
  @ApiErro(422, 'Dados inválidos')
  @ApiErro(429, 'Conta bloqueada por excesso de tentativas')
  @Public()
  @Post()
  @HttpCode(200)
  async entrar(
    @Body(new ZodValidationPipe(loginSchema)) dados: LoginDto,
    @Req() requisicao: Request,
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<{ papel: UserRole }> {
    const { token, papel } = desembrulhar(
      await this.autenticarUsuario.execute({
        ...dados,
        agora: new Date(),
        ip: requisicao.ip,
        userAgent: requisicao.headers['user-agent'],
      }),
    );

    definirCookieDeSessao(resposta, token);

    return { papel };
  }

  @ApiOperation({ summary: 'Encerra a sessão atual (logout)' })
  @ApiResponse({ status: 204, description: 'Sessão encerrada' })
  @ApiProtegida()
  @Delete('atual')
  @HttpCode(204)
  async sair(
    @CurrentUser() usuario: UsuarioAutenticado,
    @Res({ passthrough: true }) resposta: Response,
  ): Promise<void> {
    await this.sessionService.revogar(usuario.sessaoId);
    limparCookieDeSessao(resposta);
  }
}
