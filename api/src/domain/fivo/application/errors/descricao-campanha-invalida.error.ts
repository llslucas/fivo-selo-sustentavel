import { UseCaseError } from '@core/types/use-case-error';

export class DescricaoCampanhaInvalidaError
  extends Error
  implements UseCaseError
{
  readonly status = 422;

  constructor() {
    super('A descrição deve ter no máximo 2000 caracteres');
  }
}
