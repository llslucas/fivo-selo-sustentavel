import { Injectable } from '@nestjs/common';
import { Empresa, EmpresaStatus } from '../entities/empresa';
import { EmpresaRepository } from '../ports/empresa-repository';

export interface ItemParceiro {
  slug: string;
  nomeFantasia: string;
  cidade: string;
  uf: string;
  temLogo: boolean;
}

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });

@Injectable()
export class ListarParceirosUseCase {
  constructor(private readonly empresaRepository: EmpresaRepository) {}

  async execute(): Promise<ItemParceiro[]> {
    const empresas = await this.empresaRepository.listarPorEstado(
      EmpresaStatus.APROVADA,
      'asc',
    );

    return empresas
      .flatMap((empresa) => this.projetar(empresa))
      .sort((a, b) => collator.compare(a.nomeFantasia, b.nomeFantasia));
  }

  private projetar(empresa: Empresa): ItemParceiro[] {
    const slug = empresa.slug;

    if (!slug) {
      return [];
    }

    return [
      {
        slug: slug.valor,
        nomeFantasia: empresa.nomeFantasia,
        cidade: empresa.cidade,
        uf: empresa.uf,
        temLogo: !!empresa.logoArquivoId,
      },
    ];
  }
}
