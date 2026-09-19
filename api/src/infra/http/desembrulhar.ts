import { Either } from '@core/either';

export function desembrulhar<E extends Error, V>(resultado: Either<E, V>): V {
  if (resultado.isLeft()) {
    throw resultado.value;
  }

  return resultado.value;
}
