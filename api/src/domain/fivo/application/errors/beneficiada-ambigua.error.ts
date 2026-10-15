import { UseCaseError } from '@core/types/use-case-error';

export class BeneficiadaAmbiguaError extends Error implements UseCaseError {
  readonly status = 422;

  constructor() {
    super('Informe exatamente uma beneficiada: instituição ou causa');
  }
}
