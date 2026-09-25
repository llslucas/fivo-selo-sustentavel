import { Entity } from '@core/types/entities/entity';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Optional } from '@core/types/optional';
import { Either, left, right } from '@core/either';
import { NomeCausaInvalidoError } from '../application/errors/beneficiada-ambigua.error';
import { TransicaoInvalidaError } from '../application/errors/transicao-invalida.error';

export enum CausaStatus {
  ATIVA = 'ATIVA',
  INATIVA = 'INATIVA',
}

export interface CausaProps {
  nome: string;
  descricao: string;
  status: CausaStatus;
  createdAt: Date;
  updatedAt?: Date | null;
}

export class Causa extends Entity<CausaProps> {
  static create(
    props: Optional<CausaProps, 'status' | 'createdAt'>,
    id?: UniqueEntityId,
  ): Either<NomeCausaInvalidoError, Causa> {
    if (!Causa.nomeValido(props.nome)) {
      return left(new NomeCausaInvalidoError());
    }

    const causa = new Causa(
      {
        ...props,
        status: props.status ?? CausaStatus.ATIVA,
        createdAt: props.createdAt ?? new Date(),
      },
      id,
    );

    return right(causa);
  }

  get nome(): string {
    return this._props.nome;
  }

  get descricao(): string {
    return this._props.descricao;
  }

  get status(): CausaStatus {
    return this._props.status;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  get updatedAt(): Date | null | undefined {
    return this._props.updatedAt;
  }

  private static nomeValido(nome: string) {
    if (nome.length > 80) {
      return false;
    }

    if (nome.trim() === '') {
      return false;
    }

    return true;
  }

  inativar() {
    if (this._props.status === CausaStatus.INATIVA) {
      return left(new TransicaoInvalidaError());
    }

    this._props.status = CausaStatus.INATIVA;

    return right(void 0);
  }

  editar(nome: string, descricao: string) {
    if (!Causa.nomeValido(nome)) {
      return left(new NomeCausaInvalidoError());
    }

    if (this._props.status === CausaStatus.INATIVA) {
      return left(new TransicaoInvalidaError());
    }

    this._props.nome = nome;
    this._props.descricao = descricao;
  }

  estaAtiva() {
    return this._props.status === CausaStatus.ATIVA;
  }
}
