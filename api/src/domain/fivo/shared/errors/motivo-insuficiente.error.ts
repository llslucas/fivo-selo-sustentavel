import { UseCaseError } from '@core/types/use-case-error';

export class MotivoInsuficienteError extends Error implements UseCaseError {
  readonly status = 422;

  constructor() {
    super('O motivo deve ter no mínimo 20 caracteres');
  }
}
