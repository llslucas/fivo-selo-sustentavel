import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import {
  RequisicaoAutenticada,
  UsuarioAutenticado,
} from './usuario-autenticado';

export const CurrentUser = createParamDecorator(
  (
    _dados: unknown,
    contexto: ExecutionContext,
  ): UsuarioAutenticado | undefined =>
    contexto.switchToHttp().getRequest<RequisicaoAutenticada>().user,
);
