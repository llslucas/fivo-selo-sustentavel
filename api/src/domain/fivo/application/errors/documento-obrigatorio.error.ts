import { UseCaseError } from '@core/types/use-case-error';

export class DocumentoObrigatorioError extends Error implements UseCaseError {
  readonly status = 422;

  constructor() {
    super('Anexe um documento que comprove a existência da instituição.');
  }
}
