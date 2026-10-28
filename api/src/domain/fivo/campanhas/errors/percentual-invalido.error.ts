import { UseCaseError } from '@core/types/use-case-error';

export class PercentualInvalidoError extends Error implements UseCaseError {
  readonly status = 422;

  constructor() {
    super(
      'O percentual deve estar entre 0,01% e 100,00%, com no máximo 2 casas decimais',
    );
  }
}
