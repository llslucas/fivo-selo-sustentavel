import { Either, left, right } from '@core/either';
import { ValueObject } from '@core/types/entities/value-object';
import { ValorMonetarioInvalidoError } from '../application/errors/valor-monetario-invalido.error';

const FORMATO = /^\d{1,6}(\.\d{1,2})?$/;
const MINIMO_CENTAVOS = 1;
const MAXIMO_CENTAVOS = 99999999;

export interface ValorMonetarioProps {
  centavos: number;
}

export class ValorMonetario extends ValueObject<ValorMonetarioProps> {
  private constructor(props: ValorMonetarioProps) {
    super(props);
  }

  static deDecimal(
    texto: string,
  ): Either<ValorMonetarioInvalidoError, ValorMonetario> {
    if (!FORMATO.test(texto)) {
      return left(new ValorMonetarioInvalidoError());
    }

    const [inteira, decimal = ''] = texto.split('.');
    const centavos = Number(inteira + decimal.padEnd(2, '0'));

    if (centavos < MINIMO_CENTAVOS || centavos > MAXIMO_CENTAVOS) {
      return left(new ValorMonetarioInvalidoError());
    }

    return right(new ValorMonetario({ centavos }));
  }

  get centavos(): number {
    return this._props.centavos;
  }
}
