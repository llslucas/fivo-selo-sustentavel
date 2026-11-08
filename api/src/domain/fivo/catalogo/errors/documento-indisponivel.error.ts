import { UseCaseError } from '@core/types/use-case-error';

export class DocumentoIndisponivelError extends Error implements UseCaseError {
  readonly status = 503;

  constructor() {
    super('Documento temporariamente indisponível');
  }
}
