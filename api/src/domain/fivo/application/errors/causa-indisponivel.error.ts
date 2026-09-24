import { UseCaseError } from '@core/types/use-case-error';

export class CausaIndisponivelError extends Error implements UseCaseError {
  readonly status = 422;

  constructor() {
    super('Causa inválida ou inativa');
  }
}
