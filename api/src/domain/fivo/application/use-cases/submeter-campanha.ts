import { randomUUID } from 'node:crypto';
import { Either, left, right } from '@core/either';
import { NotAllowedError } from '@core/errors/not-allowed-error';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { DataCalendario } from '@domain/fivo/entities/data-calendario';
import { Injectable } from '@nestjs/common';
import { BeneficiadaAmbiguaError } from '../errors/beneficiada-ambigua.error';
import { BeneficiadaIndisponivelError } from '../errors/beneficiada-indisponivel.error';
import { CamposPendentesError } from '../errors/campos-pendentes.error';
import { TransicaoInvalidaError } from '../errors/transicao-invalida.error';
import { VigenciaVencidaError } from '../errors/vigencia-vencida.error';
import { CampanhaRepository } from '../ports/database/campanha-repository';
import { RegistroAuditoriaRepository } from '../ports/registro-auditoria-repository';
import { AssegurarBeneficiadaDisponivelUseCase } from './assegurar-beneficiada-disponivel';
import { AssegurarEmpresaAprovadaUseCase } from './assegurar-empresa-aprovada';

export interface SubmeterCampanhaUseCaseRequest {
  empresaId: string;
  /** Usuário da empresa que submete; vira o autor na auditoria. */
  usuarioId: string;
  campanhaId: string;
}

export type SubmeterCampanhaUseCaseResponse = Either<
  | NotAllowedError
  | ResourceNotFoundError
  | TransicaoInvalidaError
  | CamposPendentesError
  | VigenciaVencidaError
  | BeneficiadaAmbiguaError
  | BeneficiadaIndisponivelError,
  void
>;

@Injectable()
export class SubmeterCampanhaUseCase {
  constructor(
    private readonly campanhaRepository: CampanhaRepository,
    private readonly registroAuditoriaRepository: RegistroAuditoriaRepository,
    private readonly assegurarEmpresaAprovada: AssegurarEmpresaAprovadaUseCase,
    private readonly assegurarBeneficiadaDisponivel: AssegurarBeneficiadaDisponivelUseCase,
  ) {}

  async execute({
    empresaId,
    usuarioId,
    campanhaId,
  }: SubmeterCampanhaUseCaseRequest): Promise<SubmeterCampanhaUseCaseResponse> {
    const empresaAprovada =
      await this.assegurarEmpresaAprovada.execute(empresaId);

    if (empresaAprovada.isLeft()) {
      return left(empresaAprovada.value);
    }

    const campanha = await this.campanhaRepository.findById(campanhaId);

    // Campanha de outra empresa responde igual à inexistente, para não revelar
    // que ela existe.
    if (!campanha || campanha.empresaId.toString() !== empresaId) {
      return left(new ResourceNotFoundError('Campanha não encontrada'));
    }

    const statusAnterior = campanha.status;
    const versaoEsperada = campanha.versao;

    // A entidade valida estado e campos antes da consulta ao catálogo: uma
    // segunda submissão responde 409 mesmo que a beneficiada tenha saído do
    // catálogo nesse meio-tempo.
    const submetida = campanha.submeter(DataCalendario.hojeEm(new Date()));

    if (submetida.isLeft()) {
      return left(submetida.value);
    }

    const { beneficiada } = campanha;
    const disponivel = await this.assegurarBeneficiadaDisponivel.execute(
      beneficiada?.tipo === 'INSTITUICAO'
        ? { instituicaoId: beneficiada.id }
        : { causaId: beneficiada?.id },
    );

    if (disponivel.isLeft()) {
      return left(disponivel.value);
    }

    const salva = await this.campanhaRepository.salvar(
      campanha,
      versaoEsperada,
    );

    if (!salva) {
      return left(new TransicaoInvalidaError());
    }

    await this.registroAuditoriaRepository.registrar({
      id: randomUUID(),
      tipo: 'CAMPANHA_SUBMETIDA',
      descricao: `Campanha ${campanha.nome.valor} submetida para análise`,
      usuarioId,
      entidadeId: campanha.id.toString(),
      dados: { estadoAnterior: statusAnterior, estadoNovo: campanha.status },
      criadoEm: new Date(),
    });

    return right(undefined);
  }
}
