import { UseCaseError } from '@core/types/use-case-error';

export class UsuarioJaExisteError extends Error implements UseCaseError {
  readonly status = 409;

  constructor() {
    super('CNPJ ou e-mail já cadastrado');
  }
}
