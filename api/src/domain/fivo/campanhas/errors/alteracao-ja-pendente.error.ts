import { UseCaseError } from '@core/types/use-case-error';

export class AlteracaoJaPendenteError extends Error implements UseCaseError {
  readonly status = 409;

  constructor() {
    super('Já existe uma alteração em análise');
  }
}
