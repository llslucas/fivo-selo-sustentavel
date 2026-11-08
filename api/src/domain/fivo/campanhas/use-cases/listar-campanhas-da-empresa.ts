import { Either, left, right } from '@core/either';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { EmpresaRepository } from '@domain/fivo/empresas';
import { Injectable } from '@nestjs/common';
import { Campanha, CampanhaStatus } from '../entities/campanha';
import { CampanhaRepository } from '../ports/campanha-repository';
import { descreverRegra, RegraDoacaoDetalhe } from './campanha-detalhe';

export interface ItemCampanhaDaEmpresa {
  id: string;
  nome: string;
  status: CampanhaStatus;
  regraDoacao: RegraDoacaoDetalhe | null;
  /** Só existe depois da primeira aprovação da campanha. */
  slug: string | null;
}

export interface ListarCampanhasDaEmpresaUseCaseRequest {
  empresaId: string;
}

export type ListarCampanhasDaEmpresaUseCaseResponse = Either<
  ResourceNotFoundError,
  {
    /** Só existe depois da primeira aprovação da empresa. */
    slugEmpresa: string | null;
    campanhas: ItemCampanhaDaEmpresa[];
  }
>;

@Injectable()
export class ListarCampanhasDaEmpresaUseCase {
  constructor(
    private readonly campanhaRepository: CampanhaRepository,
    private readonly empresaRepository: EmpresaRepository,
  ) {}

  async execute({
    empresaId,
  }: ListarCampanhasDaEmpresaUseCaseRequest): Promise<ListarCampanhasDaEmpresaUseCaseResponse> {
    const empresa = await this.empresaRepository.findById(empresaId);

    if (!empresa) {
      return left(new ResourceNotFoundError('Empresa não encontrada'));
    }

    // A porta já devolve da mais recente para a mais antiga.
    const campanhas = await this.campanhaRepository.listarPorEmpresa(empresaId);

    return right({
      slugEmpresa: empresa.slug?.valor ?? null,
      campanhas: campanhas.map((campanha) => this.montarItem(campanha)),
    });
  }

  private montarItem(campanha: Campanha): ItemCampanhaDaEmpresa {
    return {
      id: campanha.id.toString(),
      nome: campanha.nome.valor,
      status: campanha.status,
      regraDoacao: campanha.regraDoacao
        ? descreverRegra(campanha.regraDoacao)
        : null,
      slug: campanha.slug?.valor ?? null,
    };
  }
}
