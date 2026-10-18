import { Either, left, right } from '@core/either';
import { ValueObject } from '@core/types/entities/value-object';
import { DataInvalidaError } from '../application/errors/data-invalida.error';

const FORMATO_AAAA_MM_DD = /^\d{4}-\d{2}-\d{2}$/;

export class DataCalendario extends ValueObject<{ valor: string }> {
  static criar(texto: string): Either<DataInvalidaError, DataCalendario> {
    if (!FORMATO_AAAA_MM_DD.test(texto)) {
      return left(new DataInvalidaError());
    }

    // Converte em UTC e confere se o texto "sobrevive" ao round-trip: datas
    // inexistentes (30 de fevereiro, mês 13...) o JS rola pra frente
    // silenciosamente, então o resultado não bate mais com o original.
    const data = new Date(`${texto}T00:00:00.000Z`);

    if (
      Number.isNaN(data.getTime()) ||
      data.toISOString().slice(0, 10) !== texto
    ) {
      return left(new DataInvalidaError());
    }

    return right(new DataCalendario({ valor: texto }));
  }

  /** O dia "de hoje" no horário de Brasília, não o dia UTC do servidor. */
  static hojeEm(agora: Date): DataCalendario {
    const texto = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(agora);

    return new DataCalendario({ valor: texto });
  }

  get valor(): string {
    return this.props.valor;
  }

  // Comparação direta sobre o texto: no formato AAAA-MM-DD, ordem lexical
  // de string já é ordem cronológica.
  ehAnteriorA(outra: DataCalendario): boolean {
    return this.props.valor < outra.props.valor;
  }

  ehPosteriorA(outra: DataCalendario): boolean {
    return this.props.valor > outra.props.valor;
  }

  equals(outra: DataCalendario): boolean {
    return this.props.valor === outra.props.valor;
  }

  toString(): string {
    return this.props.valor;
  }
}
