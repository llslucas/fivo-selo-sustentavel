import { Entity } from '@core/types/entities/entity';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Optional } from '@core/types/optional';
import { Cnpj } from './cnpj';
import { Either, left, right } from '@core/either';
import { DocumentoValidacao } from './documento-validacao';
import { TransicaoInvalidaError } from '../application/errors/transicao-invalida.error';
import { MotivoInsuficienteError } from '../application/errors/motivo-insuficiente.error';

export enum InstituicaoStatus {
  PENDENTE_APROVACAO = 'PENDENTE_APROVACAO',
  APROVADA = 'APROVADA',
  REJEITADA = 'REJEITADA',
  SUSPENSA = 'SUSPENSA',
  INATIVA = 'INATIVA',
}

export interface InstituicaoProps {
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
  status: InstituicaoStatus;
  decididoPor?: UniqueEntityId | null;
  decididoEm?: Date | null;
  motivoDecisao?: string | null;
  createdAt: Date;
  updatedAt?: Date | null;
  usuarioId?: UniqueEntityId | null;
  causaId: UniqueEntityId;
  descricao: string;
  logoArquivoId?: UniqueEntityId | null;
  documento: DocumentoValidacao;
}

export class Instituicao extends Entity<InstituicaoProps> {
  static create(
    props: Optional<
      InstituicaoProps,
      'createdAt' | 'status' | 'decididoPor' | 'decididoEm' | 'motivoDecisao'
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

  get causaId(): UniqueEntityId {
    return this._props.causaId;
  }

  get descricao(): string {
    return this._props.descricao;
  }

  get logoArquivoId(): UniqueEntityId | null | undefined {
    return this._props.logoArquivoId;
  }

  get documento(): DocumentoValidacao {
    return this._props.documento;
  }

  get status(): InstituicaoStatus {
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
    if (this._props.status !== InstituicaoStatus.PENDENTE_APROVACAO) {
      return left(new TransicaoInvalidaError());
    }

    this._props.status = InstituicaoStatus.APROVADA;
    this._props.decididoPor = adminId;
    this._props.decididoEm = new Date();

    return right(void 0);
  }

  rejeitar(
    adminId: UniqueEntityId,
    motivo: string,
  ): Either<TransicaoInvalidaError | MotivoInsuficienteError, void> {
    if (this._props.status !== InstituicaoStatus.PENDENTE_APROVACAO) {
      return left(new TransicaoInvalidaError());
    }

    if (!motivo || motivo.trim().length < 20) {
      return left(new MotivoInsuficienteError());
    }

    this._props.status = InstituicaoStatus.REJEITADA;
    this._props.decididoPor = adminId;
    this._props.decididoEm = new Date();
    this._props.motivoDecisao = motivo;

    return right(void 0);
  }

  suspender(adminId: UniqueEntityId): Either<TransicaoInvalidaError, void> {
    if (this._props.status !== InstituicaoStatus.APROVADA) {
      return left(new TransicaoInvalidaError());
    }

    this._props.status = InstituicaoStatus.SUSPENSA;
    this._props.decididoPor = adminId;
    this._props.decididoEm = new Date();

    return right(void 0);
  }

  reativar(adminId: UniqueEntityId): Either<TransicaoInvalidaError, void> {
    if (this._props.status !== InstituicaoStatus.SUSPENSA) {
      return left(new TransicaoInvalidaError());
    }

    this._props.status = InstituicaoStatus.APROVADA;
    this._props.decididoPor = adminId;
    this._props.decididoEm = new Date();

    return right(void 0);
  }

  inativar(adminId: UniqueEntityId): Either<TransicaoInvalidaError, void> {
    if (this._props.status !== InstituicaoStatus.APROVADA) {
      return left(new TransicaoInvalidaError());
    }

    this._props.status = InstituicaoStatus.INATIVA;
    this._props.decididoPor = adminId;
    this._props.decididoEm = new Date();

    return right(void 0);
  }

  reenviarParaAnalise(): Either<TransicaoInvalidaError, void> {
    if (this._props.status !== InstituicaoStatus.REJEITADA) {
      return left(new TransicaoInvalidaError());
    }

    this._props.status = InstituicaoStatus.PENDENTE_APROVACAO;

    return right(void 0);
  }

  estaDisponivelParaSelecao(): boolean {
    return this._props.status === InstituicaoStatus.APROVADA;
  }
}
