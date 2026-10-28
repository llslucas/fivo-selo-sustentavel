import { UseCaseError } from '@core/types/use-case-error';

export class ValorMonetarioInvalidoError extends Error implements UseCaseError {
  readonly status = 422;

  constructor() {
    super(
      'O valor deve estar entre R$ 0,01 e R$ 999.999,99, com no máximo 2 casas decimais',
    );
  }
}
