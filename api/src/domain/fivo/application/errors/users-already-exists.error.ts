import { UseCaseError } from '@core/types/use-case-error';

export class UserAlreadyExistsError extends Error implements UseCaseError {
  readonly status = 422;

  constructor(email: string) {
    super(`O usuário com e-mail ${email} já existe.`);
  }
}
