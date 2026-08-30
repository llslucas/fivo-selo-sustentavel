import { UseCaseError } from '@core/types/use-case-error';

export class ResourceNotFoundError extends Error implements UseCaseError {
  constructor(resource?: string) {
    super(`Resource ${resource} not found`);
  }
}
