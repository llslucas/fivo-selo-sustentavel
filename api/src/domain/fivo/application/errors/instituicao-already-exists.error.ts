import { UseCaseError } from '@core/types/use-case-error';

export class InstituicaoAlreadyExistsError
  extends Error
  implements UseCaseError
{
  readonly status = 422;

  constructor(instituicao: string) {
    super(`A instituição ${instituicao} já existe.`);
  }
}
