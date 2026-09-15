import { UseCaseError } from '@core/types/use-case-error';

export class CredenciaisInvalidasError extends Error implements UseCaseError {
  readonly status = 401;

  constructor() {
    super('Credenciais inválidas.');
  }
}
