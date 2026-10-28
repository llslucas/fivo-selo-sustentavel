import { UseCaseError } from '@core/types/use-case-error';

export class CamposPendentesError extends Error implements UseCaseError {
  readonly status = 422;

  constructor(readonly campos: string[]) {
    super('Preencha os campos obrigatórios antes de enviar para análise');
  }
}
