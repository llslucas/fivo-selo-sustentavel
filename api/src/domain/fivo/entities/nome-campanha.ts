import { Either, left, right } from '@core/either';
import { ValueObject } from '@core/types/entities/value-object';
import { NomeCampanhaInvalidoError } from '../application/errors/nome-campanha-invalido.error';

const MINIMO_CARACTERES = 3;
const MAXIMO_CARACTERES = 80;

export interface NomeCampanhaProps {
  valor: string;
}

export class NomeCampanha extends ValueObject<NomeCampanhaProps> {
  private constructor(props: NomeCampanhaProps) {
    super(props);
  }

  static criar(texto: string): Either<NomeCampanhaInvalidoError, NomeCampanha> {
    const valor = texto.trim();

    if (valor.length < MINIMO_CARACTERES || valor.length > MAXIMO_CARACTERES) {
      return left(new NomeCampanhaInvalidoError());
    }

    return right(new NomeCampanha({ valor }));
  }

  get valor(): string {
    return this._props.valor;
  }
}
