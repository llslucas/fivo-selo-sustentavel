import { UseCaseError } from '@core/types/use-case-error';

export class CnpjImutavelError extends Error implements UseCaseError {
  readonly status = 422;

  constructor() {
    super('CNPJ não pode ser alterado; solicite ao suporte');
  }
}
