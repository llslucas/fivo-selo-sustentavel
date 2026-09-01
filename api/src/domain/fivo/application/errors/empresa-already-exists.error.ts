import { UseCaseError } from '@core/types/use-case-error';

export class EmpresaAlreadyExistsError extends Error implements UseCaseError {
  readonly status = 422;

  constructor(empresa: string) {
    super(`A empresa ${empresa} já existe.`);
  }
}
