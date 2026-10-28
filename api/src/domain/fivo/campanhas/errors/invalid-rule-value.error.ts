import { UseCaseError } from '@core/types/use-case-error';

export class InvalidRuleValueError extends Error implements UseCaseError {
  readonly status = 422;

  constructor() {
    super('O Valor da regra deve corresponder à regra selecionada.');
  }
}
