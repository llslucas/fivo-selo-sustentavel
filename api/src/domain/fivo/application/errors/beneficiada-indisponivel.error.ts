import { UseCaseError } from '@core/types/use-case-error';

export class BeneficiadaIndisponivelError
  extends Error
  implements UseCaseError
{
  readonly status = 422;

  constructor() {
    super('Instituição ou causa indisponível.');
  }
}
