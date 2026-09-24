import { UseCaseError } from '@core/types/use-case-error';

export class CausaJaExisteError extends Error implements UseCaseError {
  readonly status = 409;

  constructor() {
    super('Causa já cadastrada');
  }
}
