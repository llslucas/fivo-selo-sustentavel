import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { NOME_COOKIE_SESSAO } from './auth.constants';
import { IS_PUBLIC_KEY } from './public.decorator';
import { SessionService } from './session.service';
import { RequisicaoAutenticada } from './usuario-autenticado';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessionService: SessionService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const publica = this.reflector.getAllAndOverride<boolean | undefined>(
      IS_PUBLIC_KEY,
      [contexto.getHandler(), contexto.getClass()],
    );

    if (publica) {
      return true;
    }

    const requisicao = contexto
      .switchToHttp()
      .getRequest<RequisicaoAutenticada>();
    const token: unknown = requisicao.cookies?.[NOME_COOKIE_SESSAO];

    if (typeof token !== 'string' || token.length === 0) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    const usuario = await this.sessionService.validar(token);

    if (!usuario) {
      throw new UnauthorizedException('Sessão inválida ou expirada');
    }

    requisicao.user = usuario;

    return true;
  }
}
