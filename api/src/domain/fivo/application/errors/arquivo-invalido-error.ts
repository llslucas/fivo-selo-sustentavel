import { UseCaseError } from '@core/types/use-case-error';

export class ArquivoInvalidoError extends Error implements UseCaseError {
  readonly status = 422;

  constructor(message: string) {
    super(message);
  }
}
