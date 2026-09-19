import { Entity } from '@core/types/entities/entity';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Optional } from '@core/types/optional';
import { Cnpj } from './cnpj';
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
  decididoPor?: UniqueEntityId | null;
  decididoEm?: Date | null;
  motivoDecisao?: string | null;
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
      'createdAt' | 'status' | 'decididoPor' | 'decididoEm' | 'motivoDecisao'
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

  get decididoPor(): UniqueEntityId | null | undefined {
    return this._props.decididoPor;
  }

  get decididoEm(): Date | null | undefined {
    return this._props.decididoEm;
  }

  get motivoDecisao(): string | null | undefined {
    return this._props.motivoDecisao;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  get updatedAt(): Date | null | undefined {
    return this._props.updatedAt;
  }

  aprovar(adminId: UniqueEntityId): Either<TransicaoInvalidaError, void> {
    if (this._props.status !== EmpresaStatus.PENDENTE_APROVACAO) {
      return left(new TransicaoInvalidaError());
    }

    this._props.status = EmpresaStatus.APROVADA;
    this._props.decididoPor = adminId;
    this._props.decididoEm = new Date();

    return right(void 0);
  }

  rejeitar(
    adminId: UniqueEntityId,
    motivo: string,
  ): Either<TransicaoInvalidaError | MotivoInsuficienteError, void> {
    if (this._props.status !== EmpresaStatus.PENDENTE_APROVACAO) {
      return left(new TransicaoInvalidaError());
    }

    if (!motivo || motivo.trim().length < 20) {
      return left(new MotivoInsuficienteError());
    }

    this._props.status = EmpresaStatus.REJEITADA;
    this._props.decididoPor = adminId;
    this._props.decididoEm = new Date();
    this._props.motivoDecisao = motivo;

    return right(void 0);
  }

  suspender(adminId: UniqueEntityId): Either<TransicaoInvalidaError, void> {
    if (this._props.status !== EmpresaStatus.APROVADA) {
      return left(new TransicaoInvalidaError());
    }

    this._props.status = EmpresaStatus.SUSPENSA;
    this._props.decididoPor = adminId;
    this._props.decididoEm = new Date();

    return right(void 0);
  }

  reativar(adminId: UniqueEntityId): Either<TransicaoInvalidaError, void> {
    if (this._props.status !== EmpresaStatus.SUSPENSA) {
      return left(new TransicaoInvalidaError());
    }

    this._props.status = EmpresaStatus.APROVADA;
    this._props.decididoPor = adminId;
    this._props.decididoEm = new Date();

    return right(void 0);
  }

  limparTrocaDeEmail(): void {
    this._props.emailPendente = null;
    this._props.tokenTrocaEmailHash = null;
    this._props.updatedAt = new Date();
  }

  estaAprovada(): boolean {
    return this._props.status === EmpresaStatus.APROVADA;
  }
}
