import { UseCaseError } from '@core/types/use-case-error';

/** Protege a invariante: o slug é atribuído uma vez e nunca muda. */
export class SlugJaAtribuidoError extends Error implements UseCaseError {
  readonly status = 409;

  constructor() {
    super('Slug já atribuído');
  }
}

/** Lançado pelo adaptador quando a gravação viola a unicidade do slug. */
export class SlugEmUsoError extends Error implements UseCaseError {
  readonly status = 409;

  constructor() {
    super('Slug já está em uso');
  }
}
