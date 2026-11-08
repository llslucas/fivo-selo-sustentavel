import { UseCaseError } from '@core/types/use-case-error';

export class VigenciaInvalidaError extends Error implements UseCaseError {
  readonly status = 422;

  constructor() {
    super('A data de fim deve ser posterior à data de início');
  }
}
