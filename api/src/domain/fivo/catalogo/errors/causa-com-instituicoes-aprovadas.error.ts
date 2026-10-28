import { UseCaseError } from '@core/types/use-case-error';

export class CausaComInstituicoesAprovadasError
  extends Error
  implements UseCaseError
{
  readonly status = 409;

  constructor(readonly instituicoes: string[]) {
    super(
      `Causa possui instituições aprovadas vinculadas: ${instituicoes.join(', ')}`,
    );
  }
}
