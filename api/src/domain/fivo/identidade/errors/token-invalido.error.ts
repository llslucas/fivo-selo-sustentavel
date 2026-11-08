import { UseCaseError } from '@core/types/use-case-error';

export class TokenInvalidoError extends Error implements UseCaseError {
  readonly status = 400;

  constructor() {
    super('Link de redefinição inválido ou expirado');
  }
}
