import { Either, left, right } from '@core/either';
import { ValueObject } from '@core/types/entities/value-object';
import { DescricaoCampanhaInvalidaError } from '../application/errors/descricao-campanha-invalida.error';

const TAMANHO_MAXIMO = 2000;

export class DescricaoCampanha extends ValueObject<{ valor: string }> {
  static criar(
    texto: string,
  ): Either<DescricaoCampanhaInvalidaError, DescricaoCampanha> {
    if (texto.length > TAMANHO_MAXIMO) {
      return left(new DescricaoCampanhaInvalidaError());
    }

    return right(new DescricaoCampanha({ valor: texto }));
  }

  get valor(): string {
    return this.props.valor;
  }
}
