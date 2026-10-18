import { PercentualInvalidoError } from '../application/errors/percentual-invalido.error';
import { Percentual } from './percentual';

describe('Percentual Value Object', () => {
  it.each([
    ['0.01', 1],
    ['12.5', 1250],
    ['100', 10000],
    ['1', 100],
  ])(
    'should convert a valid string into a int between 1 and 10000',
    (texto, esperado) => {
      const valor = Percentual.deDecimal(texto);

      if (valor.isLeft()) {
        throw new Error('Expected a valid value, but got an error');
      }

      expect(valor.isRight()).toBe(true);
      expect(valor.value.percentual).toBe(esperado);
    },
  );

  it.each(['0', '100.01', '1.234', '-5', ''])(
    'should reject invalid scripts with 422',
    (texto) => {
      const valor = Percentual.deDecimal(texto);

      if (valor.isRight()) {
        throw new Error('Expeced an error, but got a valid value instead');
      }

      expect(valor.value).toBeInstanceOf(PercentualInvalidoError);
      expect(valor.value.status).toBe(422);
      expect(valor.value.message).toBe(
        'O percentual deve estar entre 0,01% e 100,00%, com no máximo 2 casas decimais',
      );
    },
  );
});
