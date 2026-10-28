import { Either, left, right } from '@core/either';
import { ValueObject } from '@core/types/entities/value-object';
import { BeneficiadaAmbiguaError } from '../errors/beneficiada-ambigua.error';

export type TipoBeneficiada = 'INSTITUICAO' | 'CAUSA';

export interface BeneficiadaProps {
  tipo: TipoBeneficiada;
  id: string;
}

export interface CriarBeneficiadaProps {
  instituicaoId?: string;
  causaId?: string;
}

export class Beneficiada extends ValueObject<BeneficiadaProps> {
  private constructor(props: BeneficiadaProps) {
    super(props);
  }

  static criar({
    instituicaoId,
    causaId,
  }: CriarBeneficiadaProps): Either<BeneficiadaAmbiguaError, Beneficiada> {
    if (instituicaoId && !causaId) {
      return right(new Beneficiada({ tipo: 'INSTITUICAO', id: instituicaoId }));
    }

    if (causaId && !instituicaoId) {
      return right(new Beneficiada({ tipo: 'CAUSA', id: causaId }));
    }

    return left(new BeneficiadaAmbiguaError());
  }

  get tipo(): TipoBeneficiada {
    return this._props.tipo;
  }

  get id(): string {
    return this._props.id;
  }
}
