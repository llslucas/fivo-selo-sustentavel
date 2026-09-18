import { UseCaseError } from '@core/types/use-case-error';

export class ContaBloqueadaError extends Error implements UseCaseError {
  readonly status = 429;

  constructor() {
    super(
      'Conta bloqueada temporariamente por excesso de tentativas de login.',
    );
  }
}
