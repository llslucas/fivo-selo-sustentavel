import { UseCaseError } from '@core/types/use-case-error';

export class SenhaFracaError extends Error implements UseCaseError {
  status = 422;

  constructor() {
    super('A senha deve ter no mínimo 10 caracteres.');
  }
}
