import { EmpresaAlreadyExistsError } from './empresa-already-exists.error';
import { UserAlreadyExistsError } from './users-already-exists.error';

describe('EmpresaAlreadyExistsError', () => {
  it('carries HTTP status 409 (EMP-01 AC3)', () => {
    expect(new EmpresaAlreadyExistsError('12345678000195').status).toBe(409);
  });
});

describe('UserAlreadyExistsError', () => {
  it('carries HTTP status 409 (EMP-01 AC3)', () => {
    expect(new UserAlreadyExistsError('user@example.com').status).toBe(409);
  });
});
