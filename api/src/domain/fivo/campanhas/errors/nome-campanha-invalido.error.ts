import { UseCaseError } from '@core/types/use-case-error';

export class NomeCampanhaInvalidoError extends Error implements UseCaseError {
  readonly status = 422;

  constructor() {
    super('O nome deve ter entre 3 e 80 caracteres');
  }
}
