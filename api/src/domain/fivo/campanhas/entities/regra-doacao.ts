import { Either, left, right } from '@core/either';
import { ValueObject } from '@core/types/entities/value-object';
import { InvalidRuleValueError } from '../errors/invalid-rule-value.error';
import { ValorMonetario } from './valor-monetario';
import { ValorMonetarioInvalidoError } from '../errors/valor-monetario-invalido.error';
import { Percentual } from './percentual';
import { PercentualInvalidoError } from '../errors/percentual-invalido.error';

export enum TipoRegraDoacao {
  POR_UNIDADE = 'POR_UNIDADE',
  PERCENTUAL = 'PERCENTUAL',
}

export interface RegraDoacaoProps {
  tipo: TipoRegraDoacao;
  valor?: ValorMonetario;
  percentual?: Percentual;
}

export interface CriarRegraDoacaoInput {
  tipo: TipoRegraDoacao;
  valor?: string;
  percentual?: string;
}

export class RegraDoacao extends ValueObject<RegraDoacaoProps> {
  private constructor(props: RegraDoacaoProps) {
    super(props);
  }

  static criar(
    input: CriarRegraDoacaoInput,
  ): Either<
    | InvalidRuleValueError
    | ValorMonetarioInvalidoError
    | PercentualInvalidoError,
    RegraDoacao
  > {
    const { tipo, valor, percentual } = input;

    if (tipo === TipoRegraDoacao.POR_UNIDADE) {
      if (percentual !== undefined) {
        return left(new InvalidRuleValueError());
      }
      if (valor === undefined) {
        return left(new InvalidRuleValueError());
      }
      const resultado = ValorMonetario.deDecimal(valor);
      if (resultado.isLeft()) {
        return left(resultado.value);
      }
      return right(new RegraDoacao({ tipo, valor: resultado.value }));
    }
    if (valor !== undefined) {
      return left(new InvalidRuleValueError());
    }
    if (percentual === undefined) {
      return left(new InvalidRuleValueError());
    }

    const resultado = Percentual.deDecimal(percentual);
    if (resultado.isLeft()) {
      return left(resultado.value);
    }

    return right(new RegraDoacao({ tipo, percentual: resultado.value }));
  }

  get tipo(): TipoRegraDoacao {
    return this._props.tipo;
  }

  get valor(): ValorMonetario | undefined {
    return this._props.valor;
  }

  get percentual(): Percentual | undefined {
    return this._props.percentual;
  }
}
