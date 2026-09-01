import { UseCaseError } from '@core/types/use-case-error';

export class CnpjInvalidoError extends Error implements UseCaseError {
  readonly status = 422;

  constructor() {
    super('CNPJ inválido');
  }
}
