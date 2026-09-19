import { UseCaseError } from '@core/types/use-case-error';

export class TokenConfirmacaoEmailInvalidoError
  extends Error
  implements UseCaseError
{
  readonly status = 400;

  constructor() {
    super('Link de confirmação inválido ou expirado');
  }
}
