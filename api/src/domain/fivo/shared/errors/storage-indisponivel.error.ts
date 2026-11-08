import { UseCaseError } from '@core/types/use-case-error';

export class StorageIndisponivelError extends Error implements UseCaseError {
  readonly status = 503;

  constructor() {
    super('Storage indisponível no momento.');
  }
}
