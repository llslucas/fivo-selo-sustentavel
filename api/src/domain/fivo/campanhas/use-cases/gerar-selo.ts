import { Either, left, right } from '@core/either';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { EmpresaRepository } from '@domain/fivo/empresas';
import { Injectable } from '@nestjs/common';
import { CampanhaStatus } from '../entities/campanha';
import { CampanhaNaoAprovadaError } from '../errors/campanha-nao-aprovada.error';
import { CampanhaRepository } from '../ports/campanha-repository';
import { RenderizadorDeSelo } from '../ports/renderizador-de-selo';

export interface GerarSeloUseCaseRequest {
  empresaId: string;
  campanhaId: string;
}

export type GerarSeloUseCaseResponse = Either<
  ResourceNotFoundError | CampanhaNaoAprovadaError,
  { svg: string; slugCampanha: string }
>;

@Injectable()
export class GerarSeloUseCase {
  constructor(
    private readonly campanhaRepository: CampanhaRepository,
    private readonly empresaRepository: EmpresaRepository,
    private readonly renderizadorDeSelo: RenderizadorDeSelo,
  ) {}

  async execute({
    empresaId,
    campanhaId,
  }: GerarSeloUseCaseRequest): Promise<GerarSeloUseCaseResponse> {
    const campanha = await this.campanhaRepository.findById(campanhaId);

    // Campanha de outra empresa responde igual à inexistente, para não revelar
    // que ela existe.
    if (!campanha || campanha.empresaId.toString() !== empresaId) {
      return left(new ResourceNotFoundError('Campanha não encontrada'));
    }

    if (campanha.status !== CampanhaStatus.APROVADA) {
      return left(new CampanhaNaoAprovadaError());
    }

    const empresa = await this.empresaRepository.findById(empresaId);

    // Sem os dois slugs não há URL pública, e o QR apontaria para lugar nenhum.
    if (!campanha.slug || !empresa?.slug) {
      return left(new CampanhaNaoAprovadaError());
    }

    const slugCampanha = campanha.slug.valor;
    const svg = await this.renderizadorDeSelo.renderizar({
      slugEmpresa: empresa.slug.valor,
      slugCampanha,
    });

    return right({ svg, slugCampanha });
  }
}
