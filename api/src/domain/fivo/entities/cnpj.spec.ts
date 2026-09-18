import { InvalidCnpjError } from '../application/errors/invalid-cnpj.error';
import { Cnpj } from './cnpj';

describe('CNPJ Value Object', () => {
  it('should create a valid CNPJ', () => {
    const cnpj = Cnpj.create('12.345.678/0001-95');

    if (cnpj.isLeft()) {
      throw new Error('Expected a valid CNPJ, but got an error');
    }

    expect(cnpj.isRight()).toBe(true);
    expect(cnpj.value.valor).toBe('12345678000195');
  });

  it('Errors should contain the correct status code and message', () => {
    const cnpj = Cnpj.create('12.345.678/0001-00');

    expect(cnpj.isLeft()).toBe(true);
    if (cnpj.isLeft()) {
      expect(cnpj.value.status).toBe(422);
      expect(cnpj.value.message).toBe('CNPJ inválido');
    }
  });

  it('should return an error for an invalid CNPJ', () => {
    const cnpj = Cnpj.create('12.345.678/0001-00');

    expect(cnpj.isLeft()).toBe(true);
    expect(cnpj.value).toBeInstanceOf(InvalidCnpjError);
  });

  it('should return an error for a CNPJ with length less than 14', () => {
    const cnpj = Cnpj.create('12.345.678/0001');

    expect(cnpj.isLeft()).toBe(true);
    expect(cnpj.value).toBeInstanceOf(InvalidCnpjError);
  });

  it('should return an error for a CNPJ with length greater than 14', () => {
    const cnpj = Cnpj.create('12.345.678/0001-9500');

    expect(cnpj.isLeft()).toBe(true);
    expect(cnpj.value).toBeInstanceOf(InvalidCnpjError);
  });

  it('should return an error for a CNPJ with non-numeric characters', () => {
    const cnpj = Cnpj.create('12.345.678/0001-AB');

    expect(cnpj.isLeft()).toBe(true);
    expect(cnpj.value).toBeInstanceOf(InvalidCnpjError);
  });

  it('should return an error for a CNPJ with an empty string', () => {
    const cnpj = Cnpj.create('');

    expect(cnpj.isLeft()).toBe(true);
    expect(cnpj.value).toBeInstanceOf(InvalidCnpjError);
  });
});
