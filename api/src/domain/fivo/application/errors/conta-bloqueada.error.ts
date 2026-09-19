import { UseCaseError } from '@core/types/use-case-error';

export class ContaBloqueadaError extends Error implements UseCaseError {
  readonly status = 429;

  constructor() {
    super('Muitas tentativas, tente em 15 minutos');
  }
}
