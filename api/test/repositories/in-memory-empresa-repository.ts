import { EmpresaRepository } from '@domain/fivo/application/ports/database/empresa-repository';
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
}
