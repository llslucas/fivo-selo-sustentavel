import { UseCaseError } from '@core/types/use-case-error';

export class BeneficiadaIndisponivelNaDecisaoError
  extends Error
  implements UseCaseError
{
  readonly status = 409;

  constructor() {
    super('A beneficiada não está mais disponível no catálogo');
  }
}
