import { UseCaseError } from '@core/types/use-case-error';

export class DataInvalidaError extends Error implements UseCaseError {
  readonly status = 422;

  constructor() {
    super('Data inválida. Use o formato AAAA-MM-DD');
  }
}
