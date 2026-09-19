import type { Request } from 'express';

import { UserRole } from '@domain/fivo/entities/user';

export interface UsuarioAutenticado {
  id: string;
  role: UserRole;
  sessaoId: string;
}

export type RequisicaoAutenticada = Request & { user?: UsuarioAutenticado };
