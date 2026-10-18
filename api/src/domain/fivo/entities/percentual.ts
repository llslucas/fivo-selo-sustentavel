import { Either, left, right } from '@core/either';
import { ValueObject } from '@core/types/entities/value-object';
import { PercentualInvalidoError } from '../application/errors/percentual-invalido.error';

const FORMATO = /^\d{1,3}(\.\d{1,2})?$/;
const PERCENTUAL_MINIMO = 1;
const PERCENTUAL_MAXIMO = 10000;

export interface PercentualProps {
  percentual: number;
}

export class Percentual extends ValueObject<PercentualProps> {
  private constructor(props: PercentualProps) {
    super(props);
  }

  static deDecimal(texto: string): Either<PercentualInvalidoError, Percentual> {
    if (!FORMATO.test(texto)) {
      return left(new PercentualInvalidoError());
    }

    const [inteira, decimal = ''] = texto.split('.');
    const percentual = Number(inteira + decimal.padEnd(2, '0'));

    if (percentual < PERCENTUAL_MINIMO || percentual > PERCENTUAL_MAXIMO) {
      return left(new PercentualInvalidoError());
    }

    return right(new Percentual({ percentual }));
  }

  get percentual(): number {
    return this._props.percentual;
  }
}
