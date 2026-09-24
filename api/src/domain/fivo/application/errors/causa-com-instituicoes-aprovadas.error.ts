import { UseCaseError } from '@core/types/use-case-error';

export class CausaComInstituicoesAprovadasError
  extends Error
  implements UseCaseError
{
  readonly status = 409;

  constructor(instituicoesAprovadas: string[]) {
    super(`CNPJ ou e-mail já cadastrado: ${instituicoesAprovadas.join(', ')}`);
  }
}
