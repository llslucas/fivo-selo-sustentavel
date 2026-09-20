import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRole } from '@domain/fivo/entities/user';

import { ROLES_KEY } from './roles.decorator';
import { RequisicaoAutenticada } from './usuario-autenticado';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const papeis = this.reflector.getAllAndOverride<UserRole[] | undefined>(
      ROLES_KEY,
      [contexto.getHandler(), contexto.getClass()],
    );

    if (!papeis || papeis.length === 0) {
      return true;
    }

    const { user } = contexto
      .switchToHttp()
      .getRequest<RequisicaoAutenticada>();

    if (!user || !papeis.includes(user.role)) {
      throw new ForbiddenException('Acesso negado');
    }

    return true;
  }
}
