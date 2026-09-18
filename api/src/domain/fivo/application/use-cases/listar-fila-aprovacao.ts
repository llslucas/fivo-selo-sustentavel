import { Injectable } from '@nestjs/common';
import { EmpresaStatus } from '@domain/fivo/entities/empresa';
import { EmpresaRepository } from '../ports/database/empresa-repository';
import { UserRepository } from '../ports/database/user-repository';

export interface ItemFilaAprovacao {
  id: string;
  razaoSocial: string;
  cnpj: string;
  email: string;
  createdAt: Date;
}

@Injectable()
export class ListarFilaAprovacaoUseCase {
  constructor(
    private readonly empresaRepository: EmpresaRepository,
    private readonly userRepository: UserRepository,
  ) {}

  async execute(): Promise<ItemFilaAprovacao[]> {
    const empresas = await this.empresaRepository.listarPorEstado(
      EmpresaStatus.PENDENTE_APROVACAO,
      'asc',
    );

    return Promise.all(
      empresas.map(async (empresa) => {
        const empresaUser = empresa.usuarioId
          ? await this.userRepository.findById(empresa.usuarioId.toString())
          : null;

        return {
          id: empresa.id.toString(),
          razaoSocial: empresa.razaoSocial,
          cnpj: empresa.cnpj.valor,
          email: empresaUser?.email ?? '',
          createdAt: empresa.createdAt,
        };
      }),
    );
  }
}
