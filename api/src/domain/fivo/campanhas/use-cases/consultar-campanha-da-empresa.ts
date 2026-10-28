import { Either, left, right } from '@core/either';
import { ResourceNotFoundError } from '@core/errors/resource-not-found-error';
import { Injectable } from '@nestjs/common';
import { CampanhaRepository } from '../ports/campanha-repository';
import { CampanhaDetalhe, montarCampanhaDetalhe } from './campanha-detalhe';

export interface ConsultarCampanhaDaEmpresaUseCaseRequest {
  empresaId: string;
  campanhaId: string;
}

export type ConsultarCampanhaDaEmpresaUseCaseResponse = Either<
  ResourceNotFoundError,
  CampanhaDetalhe
>;

@Injectable()
export class ConsultarCampanhaDaEmpresaUseCase {
  constructor(private readonly campanhaRepository: CampanhaRepository) {}

  // Leitura não exige empresa aprovada: uma empresa pendente ou suspensa
  // continua vendo as próprias campanhas.
  async execute({
    empresaId,
    campanhaId,
  }: ConsultarCampanhaDaEmpresaUseCaseRequest): Promise<ConsultarCampanhaDaEmpresaUseCaseResponse> {
    const campanha = await this.campanhaRepository.findById(campanhaId);

    // Campanha de outra empresa responde igual à inexistente, para não revelar
    // que ela existe.
    if (!campanha || campanha.empresaId.toString() !== empresaId) {
      return left(new ResourceNotFoundError('Campanha não encontrada'));
    }

    return right(montarCampanhaDetalhe(campanha));
  }
}
