import { Either, left, right } from '@core/either';
import { Entity } from '@core/types/entities/entity';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Optional } from '@core/types/optional';
import { MotivoInsuficienteError } from '../application/errors/motivo-insuficiente.error';
import { TransicaoInvalidaError } from '../application/errors/transicao-invalida.error';
import { Compromisso } from './compromisso';

export enum AlteracaoStatus {
  EM_ANALISE = 'EM_ANALISE',
  APROVADA = 'APROVADA',
  REJEITADA = 'REJEITADA',
}

export interface AlteracaoCompromissoProps {
  campanhaId: UniqueEntityId;
  proposto: Compromisso;
  anterior: Compromisso;
  status: AlteracaoStatus;
  createdAt: Date;
  decididoPor?: UniqueEntityId | null;
  decididoEm?: Date | null;
  motivo?: string | null;
}

// Mudança de beneficiada, regra de doação ou vigência pedida numa campanha já
// aprovada. Só vale depois da decisão do admin; até lá a versão aprovada
// continua publicada. Quem cria e decide é a Campanha (não há repositório próprio).
export class AlteracaoCompromisso extends Entity<AlteracaoCompromissoProps> {
  static create(
    props: Optional<
      AlteracaoCompromissoProps,
      'status' | 'createdAt' | 'decididoPor' | 'decididoEm' | 'motivo'
    >,
    id?: UniqueEntityId,
  ): AlteracaoCompromisso {
    return new AlteracaoCompromisso(
      {
        ...props,
        status: props.status ?? AlteracaoStatus.EM_ANALISE,
        createdAt: props.createdAt ?? new Date(),
      },
      id,
    );
  }

  get campanhaId(): UniqueEntityId {
    return this._props.campanhaId;
  }

  get proposto(): Compromisso {
    return this._props.proposto;
  }

  get anterior(): Compromisso {
    return this._props.anterior;
  }

  get status(): AlteracaoStatus {
    return this._props.status;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  get decididoPor(): UniqueEntityId | null | undefined {
    return this._props.decididoPor;
  }

  get decididoEm(): Date | null | undefined {
    return this._props.decididoEm;
  }

  get motivo(): string | null | undefined {
    return this._props.motivo;
  }

  aprovar(adminId: UniqueEntityId): Either<TransicaoInvalidaError, void> {
    if (this._props.status !== AlteracaoStatus.EM_ANALISE) {
      return left(new TransicaoInvalidaError());
    }

    this._props.status = AlteracaoStatus.APROVADA;
    this._props.decididoPor = adminId;
    this._props.decididoEm = new Date();

    return right(void 0);
  }

  rejeitar(
    adminId: UniqueEntityId,
    motivo: string,
  ): Either<TransicaoInvalidaError | MotivoInsuficienteError, void> {
    if (this._props.status !== AlteracaoStatus.EM_ANALISE) {
      return left(new TransicaoInvalidaError());
    }

    if (!motivo || motivo.trim().length < 20) {
      return left(new MotivoInsuficienteError());
    }

    this._props.status = AlteracaoStatus.REJEITADA;
    this._props.decididoPor = adminId;
    this._props.decididoEm = new Date();
    this._props.motivo = motivo;

    return right(void 0);
  }
}
