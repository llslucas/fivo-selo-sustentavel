import { Cnpj } from '@domain/fivo/entities/cnpj';

const PESOS_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
const PESOS_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

function digito(base: string, pesos: number[]): number {
  const soma = base
    .split('')
    .reduce((acc, d, i) => acc + Number(d) * pesos[i], 0);
  const resto = soma % 11;

  return resto < 2 ? 0 : 11 - resto;
}

/** CNPJ válido determinístico a partir de um número de sequência. */
export function cnpjValido(sequencia: number): Cnpj {
  const base = `${String(sequencia).padStart(8, '0')}0001`;
  const primeiro = digito(base, PESOS_1);
  const segundo = digito(`${base}${primeiro}`, PESOS_2);
  const cnpj = Cnpj.create(`${base}${primeiro}${segundo}`);

  if (cnpj.isLeft()) {
    throw new Error('falha ao gerar CNPJ de teste');
  }

  return cnpj.value;
}
