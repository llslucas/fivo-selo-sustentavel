import { randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { User, UserRole } from '@domain/fivo/entities/user';
import { Injectable } from '@nestjs/common';
import { BeneficiadaIndisponivelNaDecisaoError } from '../errors/beneficiada-indisponivel-na-decisao.error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { CampanhaRepository } from '../ports/database/campanha-repository';
import { RegistroAuditoriaRepository } from '../ports/registro-auditoria-repository';
import { AssegurarBeneficiadaDisponivelUseCase } from './assegurar-beneficiada-disponivel';

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

    const aplicada = await this.campanhaRepository.salvar(
      campanha,
      versaoEsperada,
    );

    if (!aplicada) {
      return left(new TransicaoInvalidaError());
    }

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
}