import { UseCaseError } from '@core/types/use-case-error';

export class CampanhaEmAnaliseError extends Error implements UseCaseError {
  readonly status = 409;

  constructor() {
    super('Campanha em análise não pode ser editada');
  }
}
