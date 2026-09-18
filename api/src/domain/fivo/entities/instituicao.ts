import { Entity } from '@core/types/entities/entity';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Optional } from '@core/types/optional';
import { Cnpj } from './cnpj';
import { User } from './user';

export enum InstituicaoStatus {
  PENDENTE_APROVACAO = 'PENDENTE_APROVACAO',
  APROVADA = 'APROVADA',
  REJEITADA = 'REJEITADA',
  SUSPENSA = 'SUSPENSA',
}

export interface InstituicaoProps {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: Cnpj;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: number;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  site: string;
  email: string;
  contato: string;
  status: InstituicaoStatus;
  decidido_por?: User | null;
  decidido_em?: Date | null;
  motivo_decisao?: string | null;
  createdAt: Date;
  updatedAt?: Date | null;
}

export class Instituicao extends Entity<InstituicaoProps> {
  static create(
    props: Optional<
      InstituicaoProps,
      'createdAt' | 'status' | 'decidido_por' | 'decidido_em' | 'motivo_decisao'
    >,
    id?: UniqueEntityId,
  ): Instituicao {
    const instituicao = new Instituicao(
      {
        ...props,
        status: props.status ?? InstituicaoStatus.PENDENTE_APROVACAO,
        createdAt: props.createdAt ?? new Date(),
      },
      id,
    );
    return instituicao;
  }

  get razaoSocial(): string {
    return this._props.razaoSocial;
  }

  get nomeFantasia(): string {
    return this._props.nomeFantasia;
  }

  get cnpj(): Cnpj {
    return this._props.cnpj;
  }

  get telefone(): string {
    return this._props.telefone;
  }

  get cep(): string {
    return this._props.cep;
  }

  get logradouro(): string {
    return this._props.logradouro;
  }

  get numero(): number {
    return this._props.numero;
  }

  get complemento(): string | undefined {
    return this._props.complemento;
  }

  get bairro(): string {
    return this._props.bairro;
  }

  get cidade(): string {
    return this._props.cidade;
  }

  get uf(): string {
    return this._props.uf;
  }

  get site(): string {
    return this._props.site;
  }

  get email(): string {
    return this._props.email;
  }

  get contato(): string {
    return this._props.contato;
  }

  get status(): InstituicaoStatus {
    return this._props.status;
  }
  set status(status: InstituicaoStatus) {
    this._props.status = status;
  }

  get decidido_por(): User | null | undefined {
    return this._props.decidido_por;
  }
  set decidido_por(user: User) {
    this._props.decidido_por = user;
  }

  get decidido_em(): Date | null | undefined {
    return this._props.decidido_em;
  }
  set decidido_em(date: Date) {
    this._props.decidido_em = date;
  }

  get motivo_decisao(): string | null | undefined {
    return this._props.motivo_decisao;
  }
  set motivo_decisao(motivo: string) {
    this._props.motivo_decisao = motivo;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  get updatedAt(): Date | null | undefined {
    return this._props.updatedAt;
  }
}
