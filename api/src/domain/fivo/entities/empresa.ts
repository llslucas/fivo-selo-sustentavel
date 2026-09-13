import { Entity } from '@core/types/entities/entity';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Optional } from '@core/types/optional';
import { Cnpj } from './cnpj';
import { User } from './user';
import { TransicaoInvalidaError } from '../application/errors/transicao-invalida.error';
import { Either, left, right } from '@core/either';
import { MotivoInsuficienteError } from '../application/errors/motivo-insuficiente.error';

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
  telefone: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  site: string;
  contato: string;
  status: EmpresaStatus;
  decidido_por?: User | null;
  decidido_em?: Date | null;
  motivo_decisao?: string | null;
  createdAt: Date;
  updatedAt?: Date | null;
  usuarioId?: UniqueEntityId | null;
  logoArquivoId?: UniqueEntityId | null;
  emailPendente?: string | null;
  tokenTrocaEmailHash?: string | null;
}

export class Empresa extends Entity<EmpresaProps> {
  static create(
    props: Optional<
      EmpresaProps,
      'createdAt' | 'status' | 'decidido_por' | 'decidido_em' | 'motivo_decisao'
    >,
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

  get telefone(): string {
    return this._props.telefone;
  }

  get cep(): string {
    return this._props.cep;
  }

  get logradouro(): string {
    return this._props.logradouro;
  }

  get numero(): string {
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

  get contato(): string {
    return this._props.contato;
  }

  get usuarioId(): UniqueEntityId | null | undefined {
    return this._props.usuarioId;
  }

  get emailPendente(): string | null | undefined {
    return this._props.emailPendente;
  }

  get tokenTrocaEmailHash(): string | null | undefined {
    return this._props.tokenTrocaEmailHash;
  }

  get logoArquivoId(): UniqueEntityId | null | undefined {
    return this._props.logoArquivoId;
  }

  get status(): EmpresaStatus {
    return this._props.status;
  }

  get decidido_por(): User | null | undefined {
    return this._props.decidido_por;
  }

  get decidido_em(): Date | null | undefined {
    return this._props.decidido_em;
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

  aprovar(admin: User): Either<TransicaoInvalidaError, void> {
    if (this._props.status !== EmpresaStatus.PENDENTE_APROVACAO) {
      return left(new TransicaoInvalidaError());
    }

    this._props.status = EmpresaStatus.APROVADA;
    this._props.decidido_por = admin;
    this._props.decidido_em = new Date();

    return right(void 0);
  }

  rejeitar(
    admin: User,
    motivo: string,
  ): Either<TransicaoInvalidaError | MotivoInsuficienteError, void> {
    if (this._props.status !== EmpresaStatus.PENDENTE_APROVACAO) {
      return left(new TransicaoInvalidaError());
    }

    if (!motivo || motivo.trim() === '') {
      return left(new MotivoInsuficienteError());
    }

    this._props.status = EmpresaStatus.REJEITADA;
    this._props.decidido_por = admin;
    this._props.decidido_em = new Date();
    this._props.motivo_decisao = motivo;

    return right(void 0);
  }

  suspender(admin: User): Either<TransicaoInvalidaError, void> {
    if (this._props.status !== EmpresaStatus.APROVADA) {
      return left(new TransicaoInvalidaError());
    }

    this._props.status = EmpresaStatus.SUSPENSA;
    this._props.decidido_por = admin;
    this._props.decidido_em = new Date();

    return right(void 0);
  }

  reativar(admin: User): Either<TransicaoInvalidaError, void> {
    if (this._props.status !== EmpresaStatus.SUSPENSA) {
      return left(new TransicaoInvalidaError());
    }

    this._props.status = EmpresaStatus.APROVADA;
    this._props.decidido_por = admin;
    this._props.decidido_em = new Date();

    return right(void 0);
  }

  estaAprovada(): boolean {
    return this._props.status === EmpresaStatus.APROVADA;
  }
}
