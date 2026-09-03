export class WrongCredentialsError extends Error {
  static readonly status = 401;

  constructor() {
    super('Wrong credentials provided');
  }
}
