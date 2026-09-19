import {
  EmpresaRepository,
  OrdenacaoListaEmpresa,
} from '@domain/fivo/application/ports/database/empresa-repository';
import { Empresa } from '@domain/fivo/entities/empresa';

export class InMemoryEmpresaRepository implements EmpresaRepository {
  public items: Empresa[] = [];

  findById(id: string): Promise<Empresa | null> {
    const empresa = this.items.find((item) => item.id.toString() === id);
    return Promise.resolve(empresa ?? null);
  }

  findByCnpj(cnpj: string): Promise<Empresa | null> {
    const empresa = this.items.find((item) => item.cnpj.valor === cnpj);
    return Promise.resolve(empresa ?? null);
  }

  findByUsuarioId(usuarioId: string): Promise<Empresa | null> {
    const empresa = this.items.find(
      (item) => item.usuarioId?.toString() === usuarioId,
    );
    return Promise.resolve(empresa ?? null);
  }

  findByTokenTrocaEmailHash(hash: string): Promise<Empresa | null> {
    const empresa = this.items.find(
      (item) => item.tokenTrocaEmailHash === hash,
    );
    return Promise.resolve(empresa ?? null);
  }

  listarPorEstado(
    estado: string,
    ordem: OrdenacaoListaEmpresa,
  ): Promise<Empresa[]> {
    const empresas = this.items.filter(
      (item) => (item.status as string) === estado,
    );

    const sorted = [...empresas].sort((a, b) => {
      const left = a.createdAt.getTime();
      const right = b.createdAt.getTime();
      return ordem === 'asc' ? left - right : right - left;
    });

    return Promise.resolve(sorted);
  }

  create(empresa: Empresa): Promise<void> {
    this.items.push(empresa);
    return Promise.resolve();
  }

  save(empresa: Empresa): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(empresa.id));

    if (index !== -1) {
      this.items[index] = empresa;
    }

    return Promise.resolve();
  }

  async salvarTransicao(empresa: Empresa): Promise<boolean> {
    await this.save(empresa);
    return true;
  }
}
