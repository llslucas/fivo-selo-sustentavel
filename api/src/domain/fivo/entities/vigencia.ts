import { Either, left, right } from '@core/either';
import { ValueObject } from '@core/types/entities/value-object';
import { VigenciaInvalidaError } from '../application/errors/vigencia-invalida.error';
import { DataCalendario } from './data-calendario';
export interface VigenciaProps {
  inicio: DataCalendario;
  fim?: DataCalendario;
}
export interface CriarVigenciaInput {
  inicio: DataCalendario;
  fim?: DataCalendario;
}
export class Vigencia extends ValueObject<VigenciaProps> {
  private constructor(props: VigenciaProps) {
    super(props);
  }
  static criar(
    input: CriarVigenciaInput,
  ): Either<VigenciaInvalidaError, Vigencia> {
    const { inicio, fim } = input;
    if (fim !== undefined) {
      if (fim.equals(inicio) || fim.ehAnteriorA(inicio)) {
        return left(new VigenciaInvalidaError());
      }
    }

    return right(new Vigencia({ inicio, fim }));
  }
  get inicio(): DataCalendario {
    return this._props.inicio;
  }

  get fim(): DataCalendario | undefined {
    return this._props.fim;
  }
  fimJaPassouEm(hoje: DataCalendario): boolean {
    if (this._props.fim === undefined) {
      return false;
    }
    return this._props.fim.equals(hoje) || this._props.fim.ehAnteriorA(hoje);
  }
  naoIniciadaEm(hoje: DataCalendario): boolean {
    return this._props.inicio.ehPosteriorA(hoje);
  }
}
