import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { AutenticarUsuarioUseCase } from '@domain/fivo/application/use-cases/autenticar-usuario';
import { UserRole } from '@domain/fivo/entities/user';
import { CurrentUser } from '@infra/auth/current-user.decorator';
import { Public } from '@infra/auth/public.decorator';
import {
  definirCookieDeSessao,
  limparCookieDeSessao,
} from '@infra/auth/session-cookie';
import { SessionService } from '@infra/auth/session.service';
import type { UsuarioAutenticado } from '@infra/auth/usuario-autenticado';

import { loginSchema } from './autenticacao.dto';
import type { LoginDto } from './autenticacao.dto';
import { desembrulhar } from './desembrulhar';
import { ZodValidationPipe } from './zod-validation.pipe';

@Controller('sessoes')
export class AutenticacaoController {
  constructor(
    private readonly autenticarUsuario: AutenticarUsuarioUseCase,
    private readonly sessionService: SessionService,
  ) {}

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
