import { Entity } from '@core/types/entities/entity';
import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Optional } from '@core/types/optional';
import { Either, left, right } from '@core/either';
import { NomeCampanha } from './nome-campanha';
import { DescricaoCampanha } from './descricao-campanha';
import { Beneficiada } from '@domain/fivo/catalogo';
import { RegraDoacao } from './regra-doacao';
import { ValorMonetario } from './valor-monetario';
import { Vigencia } from './vigencia';
import { DataCalendario } from './data-calendario';
import { Compromisso } from './compromisso';
import { AlteracaoCompromisso } from './alteracao-compromisso';
import {
  TransicaoInvalidaError,
  MotivoInsuficienteError,
  Slug,
  SlugJaAtribuidoError,
} from '@domain/fivo/shared';
import { CampanhaEmAnaliseError } from '../errors/campanha-em-analise.error';
import { CamposPendentesError } from '../errors/campos-pendentes.error';
import { VigenciaVencidaError } from '../errors/vigencia-vencida.error';
import { AlteracaoJaPendenteError } from '../errors/alteracao-ja-pendente.error';

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
  alteracaoPendente?: AlteracaoCompromisso | null;
  versao: number;
  createdAt: Date;
  updatedAt?: Date | null;
  slug?: Slug | null;
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
  // Alteração decidida nesta instância e ainda não gravada. Não faz parte das
  // props porque não é reconstruída da persistência: só existe entre a decisão
  // e o `salvar`, que grava a decisão na linha da alteração.
  private _alteracaoDecidida: AlteracaoCompromisso | null = null;

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
        slug: props.slug ?? null,
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

  get slug(): Slug | null | undefined {
    return this._props.slug;
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

  get alteracaoPendente(): AlteracaoCompromisso | null | undefined {
    return this._props.alteracaoPendente;
  }

  /**
   * Última alteração decidida (aprovada ou rejeitada) por esta instância, com
   * status, `decididoPor`, `decididoEm` e, na rejeição, `motivo`. O
   * `CampanhaRepository.salvar` lê daqui para gravar a decisão. Uma campanha
   * carregada do repositório começa sem alteração decidida.
   */
  get alteracaoDecidida(): AlteracaoCompromisso | null {
    return this._alteracaoDecidida;
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

  // Em APROVADA o compromisso não muda na hora: vira uma alteração pendente e a
  // versão aprovada continua valendo até o admin decidir. `hoje` só é usado
  // nesse caso: a alteração passa pela mesma checagem de fim da submissão.
  editarCompromisso(
    { beneficiada, regraDoacao, vigencia }: EditarCompromissoProps,
    hoje: DataCalendario,
  ): Either<
    | CampanhaEmAnaliseError
    | TransicaoInvalidaError
    | AlteracaoJaPendenteError
    | VigenciaVencidaError,
    void
  > {
    const podeEditar = this.verificarSePodeEditar();

    if (podeEditar.isLeft()) {
      return podeEditar;
    }

    if (this._props.status === CampanhaStatus.APROVADA) {
      return this.abrirAlteracao({ beneficiada, regraDoacao, vigencia }, hoje);
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

  aprovar(adminId: UniqueEntityId): Either<TransicaoInvalidaError, void> {
    if (this._props.status !== CampanhaStatus.EM_ANALISE) {
      return left(new TransicaoInvalidaError());
    }

    this._props.status = CampanhaStatus.APROVADA;
    this._props.decididoPor = adminId;
    this._props.decididoEm = new Date();
    this._props.updatedAt = new Date();

    return right(void 0);
  }

  /** O slug vai impresso no QR Code: é atribuído uma vez e nunca muda. */
  atribuirSlug(slug: Slug): Either<SlugJaAtribuidoError, void> {
    if (this._props.slug) {
      return left(new SlugJaAtribuidoError());
    }

    this._props.slug = slug;

    return right(void 0);
  }

  rejeitar(
    adminId: UniqueEntityId,
    motivo: string,
  ): Either<TransicaoInvalidaError | MotivoInsuficienteError, void> {
    if (this._props.status !== CampanhaStatus.EM_ANALISE) {
      return left(new TransicaoInvalidaError());
    }

    if (!motivo || motivo.trim().length < 20) {
      return left(new MotivoInsuficienteError());
    }

    this._props.status = CampanhaStatus.REJEITADA;
    this._props.decididoPor = adminId;
    this._props.decididoEm = new Date();
    this._props.motivoUltimaRejeicao = motivo;
    this._props.updatedAt = new Date();

    return right(void 0);
  }

  aprovarAlteracao(
    adminId: UniqueEntityId,
  ): Either<TransicaoInvalidaError, void> {
    const alteracao = this._props.alteracaoPendente;

    if (!alteracao) {
      return left(new TransicaoInvalidaError());
    }

    const resultado = alteracao.aprovar(adminId);

    if (resultado.isLeft()) {
      return resultado;
    }

    const { beneficiada, regraDoacao, vigencia } = alteracao.proposto;
    this._props.beneficiada = beneficiada;
    this._props.regraDoacao = regraDoacao;
    this._props.vigencia = vigencia;
    this._props.alteracaoPendente = null;
    this._alteracaoDecidida = alteracao;
    this._props.updatedAt = new Date();

    return right(void 0);
  }

  // O motivo fica na alteração decidida; o compromisso da campanha não muda.
  rejeitarAlteracao(
    adminId: UniqueEntityId,
    motivo: string,
  ): Either<TransicaoInvalidaError | MotivoInsuficienteError, void> {
    const alteracao = this._props.alteracaoPendente;

    if (!alteracao) {
      return left(new TransicaoInvalidaError());
    }

    const resultado = alteracao.rejeitar(adminId, motivo);

    if (resultado.isLeft()) {
      return resultado;
    }

    this._props.alteracaoPendente = null;
    this._alteracaoDecidida = alteracao;
    this._props.updatedAt = new Date();

    return right(void 0);
  }

  estaAptaASelo(): boolean {
    return this._props.status === CampanhaStatus.APROVADA;
  }

  // A checagem de empresa aprovada fica no caso de uso da página pública.
  estaPublicada(): boolean {
    return this._props.status === CampanhaStatus.APROVADA;
  }

  compromissoVigente(): Compromisso | null {
    const { beneficiada, regraDoacao, vigencia } = this._props;

    if (!beneficiada || !regraDoacao || !vigencia) {
      return null;
    }

    return Compromisso.criar({ beneficiada, regraDoacao, vigencia });
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

  private verificarSePodeEditar(): Either<
    CampanhaEmAnaliseError | TransicaoInvalidaError,
    void
  > {
    if (this._props.status === CampanhaStatus.EM_ANALISE) {
      return left(new CampanhaEmAnaliseError());
    }

    if (
      this._props.status !== CampanhaStatus.RASCUNHO &&
      this._props.status !== CampanhaStatus.REJEITADA &&
      this._props.status !== CampanhaStatus.APROVADA
    ) {
      return left(new TransicaoInvalidaError());
    }

    return right(void 0);
  }

  private abrirAlteracao(
    parcial: EditarCompromissoProps,
    hoje: DataCalendario,
  ): Either<
    TransicaoInvalidaError | AlteracaoJaPendenteError | VigenciaVencidaError,
    void
  > {
    if (this._props.alteracaoPendente) {
      return left(new AlteracaoJaPendenteError());
    }

    // Campanha aprovada sempre tem o compromisso completo; a checagem só
    // protege contra um estado montado à mão.
    const anterior = this.compromissoVigente();

    if (!anterior) {
      return left(new TransicaoInvalidaError());
    }

    const proposto = anterior.mesclar(parcial);

    if (proposto.vigencia.fimJaPassouEm(hoje)) {
      return left(new VigenciaVencidaError());
    }

    this._props.alteracaoPendente = AlteracaoCompromisso.create({
      campanhaId: this.id,
      proposto,
      anterior,
    });
    this._props.updatedAt = new Date();

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
