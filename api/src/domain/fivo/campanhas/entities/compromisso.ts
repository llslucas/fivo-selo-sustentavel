import { ValueObject } from '@core/types/entities/value-object';
import { Beneficiada } from '@domain/fivo/catalogo';
import { RegraDoacao } from './regra-doacao';
import { Vigencia } from './vigencia';

export interface CompromissoProps {
  beneficiada: Beneficiada;
  regraDoacao: RegraDoacao;
  vigencia: Vigencia;
}

export class Compromisso extends ValueObject<CompromissoProps> {
  private constructor(props: CompromissoProps) {
    super(props);
  }

  static criar(props: CompromissoProps): Compromisso {
    return new Compromisso({ ...props });
  }

  mesclar(parcial: Partial<CompromissoProps>): Compromisso {
    return new Compromisso({
      beneficiada: parcial.beneficiada ?? this._props.beneficiada,
      regraDoacao: parcial.regraDoacao ?? this._props.regraDoacao,
      vigencia: parcial.vigencia ?? this._props.vigencia,
    });
  }

  equals(outro: Compromisso): boolean {
    if (outro === null || outro === undefined) {
      return false;
    }

    return (
      this._props.beneficiada.equals(outro.beneficiada) &&
      this._props.regraDoacao.equals(outro.regraDoacao) &&
      this._props.vigencia.equals(outro.vigencia)
    );
  }

  get beneficiada(): Beneficiada {
    return this._props.beneficiada;
  }

  get regraDoacao(): RegraDoacao {
    return this._props.regraDoacao;
  }

  get vigencia(): Vigencia {
    return this._props.vigencia;
  }
}
