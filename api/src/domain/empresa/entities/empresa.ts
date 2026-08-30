import { Entity } from '@core/types/entities/entity';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Optional } from '@core/types/optional';
import { Cnpj } from './cnpj';

export enum EmpresaStatus {
  PENDENTE_APROVACAO = 'PENDENTE_APROVACAO',
  APROVADA = 'APROVADA',
  REJEITADA = 'REJEITADA',
  SUSPENSA = 'SUSPENSA',
}

export interface EmpresaProps {
  razaoSocial: string;
  nomeFantasia: string;
  cnpj: Cnpj;
  email: string;
  senha: string;
  telefone: string;
  cep: string;
  logradouro: string;
  numero: number;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  status: EmpresaStatus;
  createdAt: Date;
  updatedAt?: Date | null;
}

export class Empresa extends Entity<EmpresaProps> {
  static create(
    props: Optional<EmpresaProps, 'createdAt' | 'status'>,
    id?: UniqueEntityId,
  ): Empresa {
    const empresa = new Empresa(
      {
        ...props,
        status: props.status ?? EmpresaStatus.PENDENTE_APROVACAO,
        createdAt: props.createdAt ?? new Date(),
      },
      id,
    );
    return empresa;
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

  get email(): string {
    return this._props.email;
  }

  get senha(): string {
    return this._props.senha;
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

  get status(): EmpresaStatus {
    return this._props.status;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  get updatedAt(): Date | null | undefined {
    return this._props.updatedAt;
  }
}
