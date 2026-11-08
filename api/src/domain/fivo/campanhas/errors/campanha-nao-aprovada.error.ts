import { UseCaseError } from '@core/types/use-case-error';

export class CampanhaNaoAprovadaError extends Error implements UseCaseError {
  readonly status = 409;

  constructor() {
    super('Campanha não está aprovada');
  }
}
