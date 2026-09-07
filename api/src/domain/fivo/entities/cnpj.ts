import { Either, left, right } from '@core/either';
import { ValueObject } from '@core/types/entities/value-object';
import { InvalidCnpjError } from '../application/errors/invalid-cnpj.error';

const PESOS_PRIMEIRO_DIGITO = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_SEGUNDO_DIGITO = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function digitoVerificador(base: string, pesos: number[]): number {
  const soma = base
    .split('')
    .reduce((acc, digito, i) => acc + Number(digito) * pesos[i], 0);

  const resto = soma % 11;

  return resto < 2 ? 0 : 11 - resto;
}

export class Cnpj extends ValueObject<{ valor: string }> {
  static create(bruto: string): Either<InvalidCnpjError, Cnpj> {
    const digitos = bruto.replace(/\D/g, '');

    if (!Cnpj.isValid(digitos)) {
      return left(new InvalidCnpjError());
    }

    return right(new Cnpj({ valor: digitos }));
  }

  static isValid(digitos: string): boolean {
    if (digitos.length !== 14) {
      return false;
    }

    const base = digitos.slice(0, 12);
    const primeiro = digitoVerificador(base, PESOS_PRIMEIRO_DIGITO);
    const segundo = digitoVerificador(
      base + String(primeiro),
      PESOS_SEGUNDO_DIGITO,
    );

    if (digitos.slice(12) !== `${primeiro}${segundo}`) {
      return false;
    }

    return true;
  }

  get valor(): string {
    return this.props.valor;
  }
}
