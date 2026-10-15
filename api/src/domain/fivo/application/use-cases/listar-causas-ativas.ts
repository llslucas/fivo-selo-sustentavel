import { Injectable } from '@nestjs/common';
import { CausaRepository } from '../ports/database/causa-repository';
import { Causa } from '@domain/fivo/entities/causa';

@Injectable()
export class ListarCausasAtivasUseCase {
  constructor(private readonly causaRepository: CausaRepository) {}

  async execute(): Promise<Causa[]> {
    const causas = await this.causaRepository.listarAtivas();

    return [...causas].sort((a, b) =>
      a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
    );
  }
}
