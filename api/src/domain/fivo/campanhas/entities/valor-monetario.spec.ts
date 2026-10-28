import { ValorMonetarioInvalidoError } from '../errors/valor-monetario-invalido.error';
import { ValorMonetario } from './valor-monetario';

describe('ValorMonetario Value Object', () => {
  it.each([
    ['1.5', 150],
    ['0.01', 1],
    ['999999.99', 99999999],
    ['1', 100],
  ])('should convert "%s" to %i centavos', (texto, esperado) => {
    const valor = ValorMonetario.deDecimal(texto);

    if (valor.isLeft()) {
      throw new Error('Expected a valid value, but got an error');
    }

    expect(valor.isRight()).toBe(true);
    expect(valor.value.centavos).toBe(esperado);
  });

  it.each([
    ['0.29', 29],
    ['1.15', 115],
  ])('should not lose precision when converting "%s"', (texto, esperado) => {
    const valor = ValorMonetario.deDecimal(texto);

    if (valor.isLeft()) {
      throw new Error('Expected a valid value, but got an error');
    }

    expect(valor.value.centavos).toBe(esperado);
  });

  it.each(['0', '0.00', '1000000', '1.234', '-1', '1,50', 'abc', ''])(
    'should return an error for "%s"',
    (texto) => {
      const valor = ValorMonetario.deDecimal(texto);

      expect(valor.isLeft()).toBe(true);
      expect(valor.value).toBeInstanceOf(ValorMonetarioInvalidoError);
    },
  );

  it('Errors should contain the correct status code and message', () => {
    const valor = ValorMonetario.deDecimal('abc');

    expect(valor.isLeft()).toBe(true);
    if (valor.isLeft()) {
      expect(valor.value.status).toBe(422);
      expect(valor.value.message).toBe(
        'O valor deve estar entre R$ 0,01 e R$ 999.999,99, com no máximo 2 casas decimais',
      );
    }
  });

  it('should consider two values with the same centavos equal', () => {
    const a = ValorMonetario.deDecimal('1.5');
    const b = ValorMonetario.deDecimal('1.50');

    if (a.isLeft() || b.isLeft()) {
      throw new Error('Expected valid values, but got an error');
    }

    expect(a.value.equals(b.value)).toBe(true);
  });
});
