import { Entity } from '@core/types/entities/entity';
import { Empresa } from './empresa';
import { Instituicao } from './instituicao';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Optional } from '@core/types/optional';

export enum RegraType {
  VALOR_PERCENTUAL = 'VALOR_PERCENTUAL',
  VALOR_FIXO = 'VALOR_FIXO',
}

export enum CampanhaStatus {
  PENDENTE_APROVACAO = 'PENDENTE_APROVACAO',
  ATIVA = 'ATIVA',
  SUSPENSA = 'SUSPENSA',
  FINALIZADA = 'FINALIZADA',
}

export interface CampanhaProps {
  id_publico: UniqueEntityId;
  empresa: Empresa;
  instituicao: Instituicao;
  nome: string;
  descricao: string;
  regra_tipo: RegraType;
  regra_valor_brl: number | null;
  regra_percentual: number | null;
  meta_valor_brl: number;
  data_inicio: Date;
  data_fim: Date;
  status: CampanhaStatus;
  submmited_at: Date;
  ended_at?: Date | null | undefined;
  created_at: Date;
  updated_at?: Date | null;
}

export class Campanha extends Entity<CampanhaProps> {
  static create(
    props: Optional<
      CampanhaProps,
      'id_publico' | 'status' | 'submmited_at' | 'created_at'
    >,
    id?: UniqueEntityId,
  ): Campanha {
    const campanha = new Campanha(
      {
        ...props,
        id_publico: props.id_publico ?? new UniqueEntityId(),
        status: props.status ?? CampanhaStatus.PENDENTE_APROVACAO,
        submmited_at: props.submmited_at ?? new Date(),
        created_at: props.created_at ?? new Date(),
      },
      id,
    );
    return campanha;
  }

  get id_publico(): UniqueEntityId {
    return this._props.id_publico;
  }

  get nome(): string {
    return this._props.nome;
  }

  get descricao(): string {
    return this._props.descricao;
  }

  get regra_tipo(): RegraType {
    return this._props.regra_tipo;
  }

  get regra_valor_brl(): number | null {
    return this._props.regra_valor_brl;
  }

  get regra_percentual(): number | null {
    return this._props.regra_percentual;
  }

  get meta_valor_brl(): number {
    return this._props.meta_valor_brl;
  }

  get data_inicio(): Date {
    return this._props.data_inicio;
  }

  get data_fim(): Date {
    return this._props.data_fim;
  }

  get status(): CampanhaStatus {
    return this._props.status;
  }

  get submmited_at(): Date {
    return this._props.submmited_at;
  }

  get ended_at(): Date | null | undefined {
    return this._props.ended_at;
  }

  get created_at(): Date {
    return this._props.created_at;
  }

  get updated_at(): Date | null | undefined {
    return this._props.updated_at;
  }
}
