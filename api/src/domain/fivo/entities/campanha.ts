import { Entity } from '@core/types/entities/entity';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Optional } from '@core/types/optional';
import { Either, left, right } from '@core/either';
import { NomeCampanha } from './nome-campanha';
import { DescricaoCampanha } from './descricao-campanha';
import { Beneficiada } from './beneficiada';
import { RegraDoacao } from './regra-doacao';
import { ValorMonetario } from './valor-monetario';
import { Vigencia } from './vigencia';
import { DataCalendario } from './data-calendario';
import { TransicaoInvalidaError } from '../application/errors/transicao-invalida.error';
import { CampanhaEmAnaliseError } from '../application/errors/campanha-em-analise.error';
import { CamposPendentesError } from '../application/errors/campos-pendentes.error';
import { VigenciaVencidaError } from '../application/errors/vigencia-vencida.error';

export enum CampanhaStatus {
  RASCUNHO = 'RASCUNHO',
  EM_ANALISE = 'EM_ANALISE',
  APROVADA = 'APROVADA',
  REJEITADA = 'REJEITADA',
}

export interface CampanhaProps {
  empresaId: UniqueEntityId;
  idPublico: UniqueEntityId;
  nome: NomeCampanha;
  descricao?: DescricaoCampanha | null;
  capaArquivoId?: UniqueEntityId | null;
  beneficiada?: Beneficiada | null;
  regraDoacao?: RegraDoacao | null;
  meta?: ValorMonetario | null;
  vigencia?: Vigencia | null;
  status: CampanhaStatus;
  submetidaEm?: Date | null;
  decididoPor?: UniqueEntityId | null;
  decididoEm?: Date | null;
  motivoUltimaRejeicao?: string | null;
  versao: number;
  createdAt: Date;
  updatedAt?: Date | null;
}

export interface CriarCampanhaProps {
  empresaId: UniqueEntityId;
  nome: NomeCampanha;
}

export interface EditarTextosProps {
  nome?: NomeCampanha;
  descricao?: DescricaoCampanha;
  capaArquivoId?: UniqueEntityId;
  meta?: ValorMonetario;
}

export interface EditarCompromissoProps {
  beneficiada?: Beneficiada;
  regraDoacao?: RegraDoacao;
  vigencia?: Vigencia;
}

export class Campanha extends Entity<CampanhaProps> {
  static create(
    props: Optional<
      CampanhaProps,
      'idPublico' | 'status' | 'versao' | 'createdAt'
    >,
    id?: UniqueEntityId,
  ): Campanha {
    const campanha = new Campanha(
      {
        ...props,
        idPublico: props.idPublico ?? new UniqueEntityId(),
        status: props.status ?? CampanhaStatus.RASCUNHO,
        versao: props.versao ?? 0,
        createdAt: props.createdAt ?? new Date(),
      },
      id,
    );
    return campanha;
  }

  static criar({ empresaId, nome }: CriarCampanhaProps): Campanha {
    return Campanha.create({ empresaId, nome });
  }

  get empresaId(): UniqueEntityId {
    return this._props.empresaId;
  }

  get idPublico(): UniqueEntityId {
    return this._props.idPublico;
  }

  get nome(): NomeCampanha {
    return this._props.nome;
  }

  get descricao(): DescricaoCampanha | null | undefined {
    return this._props.descricao;
  }

  get capaArquivoId(): UniqueEntityId | null | undefined {
    return this._props.capaArquivoId;
  }

  get beneficiada(): Beneficiada | null | undefined {
    return this._props.beneficiada;
  }

  get regraDoacao(): RegraDoacao | null | undefined {
    return this._props.regraDoacao;
  }

  get meta(): ValorMonetario | null | undefined {
    return this._props.meta;
  }

  get vigencia(): Vigencia | null | undefined {
    return this._props.vigencia;
  }

  get status(): CampanhaStatus {
    return this._props.status;
  }

  get submetidaEm(): Date | null | undefined {
    return this._props.submetidaEm;
  }

  get decididoPor(): UniqueEntityId | null | undefined {
    return this._props.decididoPor;
  }

  get decididoEm(): Date | null | undefined {
    return this._props.decididoEm;
  }

  get motivoUltimaRejeicao(): string | null | undefined {
    return this._props.motivoUltimaRejeicao;
  }

  get versao(): number {
    return this._props.versao;
  }

  get createdAt(): Date {
    return this._props.createdAt;
  }

  get updatedAt(): Date | null | undefined {
    return this._props.updatedAt;
  }

  editarTextos({
    nome,
    descricao,
    capaArquivoId,
    meta,
  }: EditarTextosProps): Either<
    CampanhaEmAnaliseError | TransicaoInvalidaError,
    void
  > {
    const podeEditar = this.verificarSePodeEditar();

    if (podeEditar.isLeft()) {
      return podeEditar;
    }

    if (nome !== undefined) this._props.nome = nome;
    if (descricao !== undefined) this._props.descricao = descricao;
    if (capaArquivoId !== undefined) this._props.capaArquivoId = capaArquivoId;
    if (meta !== undefined) this._props.meta = meta;

    this.voltarParaRascunhoSeRejeitada();

    return right(void 0);
  }

  editarCompromisso({
    beneficiada,
    regraDoacao,
    vigencia,
  }: EditarCompromissoProps): Either<
    CampanhaEmAnaliseError | TransicaoInvalidaError,
    void
  > {
    const podeEditar = this.verificarSePodeEditar();

    if (podeEditar.isLeft()) {
      return podeEditar;
    }

    if (beneficiada !== undefined) this._props.beneficiada = beneficiada;
    if (regraDoacao !== undefined) this._props.regraDoacao = regraDoacao;
    if (vigencia !== undefined) this._props.vigencia = vigencia;

    this.voltarParaRascunhoSeRejeitada();

    return right(void 0);
  }

  submeter(
    hoje: DataCalendario,
  ): Either<
    TransicaoInvalidaError | CamposPendentesError | VigenciaVencidaError,
    void
  > {
    if (this._props.status !== CampanhaStatus.RASCUNHO) {
      return left(new TransicaoInvalidaError());
    }

    const pendentes = this.camposPendentes();

    if (pendentes.length > 0) {
      return left(new CamposPendentesError(pendentes));
    }

    if (this._props.vigencia?.fimJaPassouEm(hoje)) {
      return left(new VigenciaVencidaError());
    }

    this._props.status = CampanhaStatus.EM_ANALISE;
    this._props.submetidaEm = new Date();
    this._props.updatedAt = new Date();

    return right(void 0);
  }

  camposPendentes(): string[] {
    const pendentes: string[] = [];

    if (!this._props.descricao || this._props.descricao.valor.trim() === '') {
      pendentes.push('descricao');
    }

    if (!this._props.beneficiada) {
      pendentes.push('beneficiada');
    }

    if (!this._props.regraDoacao) {
      pendentes.push('regraDoacao');
    }

    if (!this._props.vigencia?.inicio) {
      pendentes.push('vigencia.inicio');
    }

    return pendentes;
  }

  // APROVADA ainda não é editável aqui: a alteração de campanha aprovada
  // entra na T15.
  private verificarSePodeEditar(): Either<
    CampanhaEmAnaliseError | TransicaoInvalidaError,
    void
  > {
    if (this._props.status === CampanhaStatus.EM_ANALISE) {
      return left(new CampanhaEmAnaliseError());
    }

    if (
      this._props.status !== CampanhaStatus.RASCUNHO &&
      this._props.status !== CampanhaStatus.REJEITADA
    ) {
      return left(new TransicaoInvalidaError());
    }

    return right(void 0);
  }

  // Volta para RASCUNHO mantendo motivoUltimaRejeicao, para a empresa
  // continuar vendo por que a campanha foi rejeitada.
  private voltarParaRascunhoSeRejeitada(): void {
    if (this._props.status === CampanhaStatus.REJEITADA) {
      this._props.status = CampanhaStatus.RASCUNHO;
    }

    this._props.updatedAt = new Date();
  }
}
