import { UseCaseError } from '@core/types/use-case-error';

export class DescricaoDocumentoInvalidaError
  extends Error
  implements UseCaseError
{
  readonly status = 422;

  constructor() {
    super('A descrição do documento deve ter no máximo 200 caracteres');
  }
}
