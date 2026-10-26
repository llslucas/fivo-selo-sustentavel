import { randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { Compromisso } from '@domain/fivo/entities/compromisso';
import { User, UserRole } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { BeneficiadaIndisponivelNaDecisaoError } from '../errors/beneficiada-indisponivel-na-decisao.error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { CampanhaRepository } from '../ports/database/campanha-repository';
import { RegistroAuditoriaRepository } from '../ports/registro-auditoria-repository';
import { AssegurarBeneficiadaDisponivelUseCase } from './assegurar-beneficiada-disponivel';

export type AprovarAlteracaoCampanhaUseCaseResponse = Either<
  | NotAllowedError
  | ResourceNotFoundError
  | TransicaoInvalidaError
  | BeneficiadaIndisponivelNaDecisaoError,
  void
>;

// Retrato do compromisso em primitivos, para o registro de auditoria.
function descreverCompromisso(compromisso: Compromisso) {
  const { beneficiada, regraDoacao, vigencia } = compromisso;

  return {
    beneficiada: { tipo: beneficiada.tipo, id: beneficiada.id },
    regraDoacao: {
      tipo: regraDoacao.tipo,
      valorCentavos: regraDoacao.valor?.centavos ?? null,
      percentualCentesimos: regraDoacao.percentual?.percentual ?? null,
    },
    vigencia: {
      inicio: vigencia.inicio.toString(),
      fim: vigencia.fim?.toString() ?? null,
    },
  };
}

@Injectable()
export class AprovarAlteracaoCampanhaUseCase {
  constructor(
    private readonly campanhaRepository: CampanhaRepository,
    private readonly registroAuditoriaRepository: RegistroAuditoriaRepository,
    private readonly assegurarBeneficiadaDisponivel: AssegurarBeneficiadaDisponivelUseCase,
  ) {}

  async execute(
    campanhaId: string,
    user: User,
  ): Promise<AprovarAlteracaoCampanhaUseCaseResponse> {
    if (user.role !== UserRole.ADMIN) {
      return left(new NotAllowedError());
    }

    const campanha = await this.campanhaRepository.findById(campanhaId);

    if (!campanha) {
      return left(new ResourceNotFoundError('Campanha não encontrada'));
    }

    const alteracao = campanha.alteracaoPendente;

    if (!alteracao) {
      return left(new TransicaoInvalidaError());
    }

    const { anterior, proposto } = alteracao;

    // Só a beneficiada que a alteração traz precisa ser conferida; a atual já
    // passou pela aprovação da campanha.
    if (!proposto.beneficiada.equals(anterior.beneficiada)) {
      const { tipo, id } = proposto.beneficiada;
      const disponivel = await this.assegurarBeneficiadaDisponivel.execute(
        tipo === 'INSTITUICAO' ? { instituicaoId: id } : { causaId: id },
      );

      if (disponivel.isLeft()) {
        return left(new BeneficiadaIndisponivelNaDecisaoError());
      }
    }

    const versaoEsperada = campanha.versao;
    const result = campanha.aprovarAlteracao(user.id);

    if (result.isLeft()) {
      return left(result.value);
    }

    const aplicada = await this.campanhaRepository.salvar(
      campanha,
      versaoEsperada,
    );

    if (!aplicada) {
      return left(new TransicaoInvalidaError());
    }

    await this.registroAuditoriaRepository.registrar({
      id: randomUUID(),
      tipo: 'ALTERACAO_CAMPANHA_APROVADA',
      descricao: `Alteração da campanha ${campanha.nome.valor} aprovada`,
      usuarioId: user.id.toString(),
      entidadeId: campanha.id.toString(),
      dados: {
        compromissoAnterior: descreverCompromisso(anterior),
        compromissoNovo: descreverCompromisso(proposto),
      },
      criadoEm: new Date(),
    });

    return right(undefined);
  }
}
