import { EmpresaAlreadyExistsError } from './empresa-already-exists.error';

describe('EmpresaAlreadyExistsError', () => {
  it('carries HTTP status 409 and the exact EMP-01 AC3 message', () => {
    const error = new EmpresaAlreadyExistsError();
    expect(error.status).toBe(409);
    expect(error.message).toBe('CNPJ ou e-mail já cadastrado');
  });
});
