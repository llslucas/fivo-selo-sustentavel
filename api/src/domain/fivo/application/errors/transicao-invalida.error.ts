import { UseCaseError } from '@core/types/use-case-error';

export class TransicaoInvalidaError extends Error implements UseCaseError {
  readonly status = 409;

  constructor() {
    super('Transição inválida.');
  }
}
