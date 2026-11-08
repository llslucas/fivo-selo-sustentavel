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
} from '@domain/fivo/shared';
import { CampanhaRepository } from '../ports/campanha-repository';
import { AssegurarBeneficiadaDisponivelUseCase } from '@domain/fivo/catalogo';
import { descreverCompromisso } from './campanha-detalhe';

export type AprovarAlteracaoCampanhaUseCaseResponse = Either<
  | NotAllowedError
  | ResourceNotFoundError
  | TransicaoInvalidaError
  | BeneficiadaIndisponivelNaDecisaoError,
  void
>;

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
