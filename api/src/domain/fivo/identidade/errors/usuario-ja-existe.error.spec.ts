import { UsuarioJaExisteError } from './usuario-ja-existe.error';

describe('UsuarioJaExisteError', () => {
  it('carries HTTP status 409 and the exact EMP-01 AC3 message', () => {
    const error = new UsuarioJaExisteError();
    expect(error.status).toBe(409);
    expect(error.message).toBe('CNPJ ou e-mail já cadastrado');
  });
});
