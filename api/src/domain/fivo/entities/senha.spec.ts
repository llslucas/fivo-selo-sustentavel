import { SenhaFracaError } from '../application/errors/senha-fraca.error';
import { Senha } from './senha';

describe('Senha Value Object', () => {
  it('should create a new password when the length is bigger than 10 characters', () => {
    const senha = '12345678900';
    const result = Senha.create(senha);

    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.props.senha).toBe(senha);
    }
  });

  it('should create a new password when the password have 10 characters', () => {
    const senha = '1234567890';
    const result = Senha.create(senha);

    expect(result.isRight()).toBe(true);

    if (result.isRight()) {
      expect(result.value.props.senha).toBe(senha);
    }
  });

  it('should return an SenhaFracaError when the password have 9 or less characters', () => {
    const senha = '123456789';
    const result = Senha.create(senha);

    expect(result.isLeft()).toBe(true);

    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(SenhaFracaError);
    }
  });

  it('should return an SenhaFracaError when the password have 0 characters', () => {
    const senha = '';
    const result = Senha.create(senha);

    expect(result.isLeft()).toBe(true);

    if (result.isLeft()) {
      expect(result.value).toBeInstanceOf(SenhaFracaError);
    }
  });
});
