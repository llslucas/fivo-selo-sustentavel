import { randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { User, UserRole } from '@domain/fivo/identidade';
import { Injectable } from '@nestjs/common';
import { BeneficiadaIndisponivelNaDecisaoError } from '../errors/beneficiada-indisponivel-na-decisao.error';
import {
  TransicaoInvalidaError,
  RegistroAuditoriaRepository,
  Slug,
  SlugEmUsoError,
  proximoSlugLivre,
} from '@domain/fivo/shared';
import { Campanha, CampanhaStatus } from '../entities/campanha';
import { CampanhaRepository } from '../ports/campanha-repository';
import { AssegurarBeneficiadaDisponivelUseCase } from '@domain/fivo/catalogo';

/** Aprovações simultâneas de homônimas disputam o mesmo slug (VIT-01). */
const TENTATIVAS_DE_SLUG = 3;

type Decisao = Either<
  | ResourceNotFoundError
  | TransicaoInvalidaError
  | BeneficiadaIndisponivelNaDecisaoError,
  { campanha: Campanha; statusAnterior: CampanhaStatus }
>;

export type AprovarCampanhaUseCaseResponse = Either<
  | NotAllowedError
  | ResourceNotFoundError
  | TransicaoInvalidaError
  | BeneficiadaIndisponivelNaDecisaoError,
  void
>;

@Injectable()
export class AprovarCampanhaUseCase {
  constructor(
    private readonly campanhaRepository: CampanhaRepository,
    private readonly registroAuditoriaRepository: RegistroAuditoriaRepository,
    private readonly assegurarBeneficiadaDisponivel: AssegurarBeneficiadaDisponivelUseCase,
  ) {}

  async execute(
    campanhaId: string,
    user: User,
  ): Promise<AprovarCampanhaUseCaseResponse> {
    if (user.role !== UserRole.ADMIN) {
      return left(new NotAllowedError());
    }

    const decisao = await this.aprovarComSlug(campanhaId, user);

    if (decisao.isLeft()) {
      return left(decisao.value);
    }

    const { campanha, statusAnterior } = decisao.value;

    await this.registroAuditoriaRepository.registrar({
      id: randomUUID(),
      tipo: 'CAMPANHA_APROVADA',
      descricao: `Campanha ${campanha.nome.valor} aprovada`,
      usuarioId: user.id.toString(),
      entidadeId: campanha.id.toString(),
      dados: {
        estadoAnterior: statusAnterior,
        estadoNovo: campanha.status,
      },
      criadoEm: new Date(),
    });

    return right(undefined);
  }

  /**
   * Em `SlugEmUsoError`, outra aprovação gravou o mesmo slug primeiro: relê a
   * campanha e recalcula o sufixo. Esgotadas as tentativas, o erro sobe.
   */
  private async aprovarComSlug(
    campanhaId: string,
    user: User,
  ): Promise<Decisao> {
    for (let tentativa = 1; ; tentativa++) {
      try {
        return await this.tentarAprovar(campanhaId, user);
      } catch (error) {
        if (
          !(error instanceof SlugEmUsoError) ||
          tentativa >= TENTATIVAS_DE_SLUG
        ) {
          throw error;
        }
      }
    }
  }

  private async tentarAprovar(
    campanhaId: string,
    user: User,
  ): Promise<Decisao> {
    const campanha = await this.campanhaRepository.findById(campanhaId);

    if (!campanha) {
      return left(new ResourceNotFoundError('Campanha não encontrada'));
    }

    // A beneficiada pode ter sido suspensa ou inativada enquanto a campanha
    // esperava na fila.
    if (campanha.beneficiada) {
      const { tipo, id } = campanha.beneficiada;
      const disponivel = await this.assegurarBeneficiadaDisponivel.execute(
        tipo === 'INSTITUICAO' ? { instituicaoId: id } : { causaId: id },
      );

      if (disponivel.isLeft()) {
        return left(new BeneficiadaIndisponivelNaDecisaoError());
      }
    }

    const statusAnterior = campanha.status;
    const versaoEsperada = campanha.versao;
    const result = campanha.aprovar(user.id);

    if (result.isLeft()) {
      return left(result.value);
    }

    if (!campanha.slug) {
      const base = Slug.de(campanha.nome.valor, 'campanha');
      const daEmpresa = await this.campanhaRepository.listarPorEmpresa(
        campanha.empresaId.toString(),
      );
      const ocupados = daEmpresa
        .map((item) => item.slug?.valor)
        .filter((valor): valor is string => !!valor);
      campanha.atribuirSlug(proximoSlugLivre(base, ocupados));
    }

    const aplicada = await this.campanhaRepository.salvar(
      campanha,
      versaoEsperada,
    );

    if (!aplicada) {
      return left(new TransicaoInvalidaError());
    }

    return right({ campanha, statusAnterior });
  }
}
