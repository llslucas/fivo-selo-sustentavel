import {
  EmpresaRepository,
  OrdenacaoListaEmpresa,
} from '@domain/fivo/application/ports/database/empresa-repository';
import { Empresa } from '@domain/fivo/entities/empresa';

/**
 * Copia a entidade para que o double guarde um estado próprio, como uma linha
 * de banco: mutar o objeto lido não muda o armazenado sem um `save` ou um
 * `salvarTransicao`. `decisao` fornece as 4 colunas de decisão, que o `save`
 * preserva do item guardado.
 */
function copiar(empresa: Empresa, decisao: Empresa = empresa): Empresa {
  return Empresa.create(
    {
      razaoSocial: empresa.razaoSocial,
      nomeFantasia: empresa.nomeFantasia,
      cnpj: empresa.cnpj,
      telefone: empresa.telefone,
      cep: empresa.cep,
      logradouro: empresa.logradouro,
      numero: empresa.numero,
      complemento: empresa.complemento,
      bairro: empresa.bairro,
      cidade: empresa.cidade,
      uf: empresa.uf,
      site: empresa.site,
      contato: empresa.contato,
      createdAt: empresa.createdAt,
      updatedAt: empresa.updatedAt,
      usuarioId: empresa.usuarioId,
      logoArquivoId: empresa.logoArquivoId,
      emailPendente: empresa.emailPendente,
      tokenTrocaEmailHash: empresa.tokenTrocaEmailHash,
      status: decisao.status,
      decididoPor: decisao.decididoPor,
      decididoEm: decisao.decididoEm,
      motivoDecisao: decisao.motivoDecisao,
    },
    empresa.id,
  );
}

export class InMemoryEmpresaRepository implements EmpresaRepository {
  public items: Empresa[] = [];

  findById(id: string): Promise<Empresa | null> {
    const empresa = this.items.find((item) => item.id.toString() === id);
    return Promise.resolve(empresa ? copiar(empresa) : null);
  }

  findByCnpj(cnpj: string): Promise<Empresa | null> {
    const empresa = this.items.find((item) => item.cnpj.valor === cnpj);
    return Promise.resolve(empresa ? copiar(empresa) : null);
  }

  findByUsuarioId(usuarioId: string): Promise<Empresa | null> {
    const empresa = this.items.find(
      (item) => item.usuarioId?.toString() === usuarioId,
    );
    return Promise.resolve(empresa ? copiar(empresa) : null);
  }

  findByTokenTrocaEmailHash(hash: string): Promise<Empresa | null> {
    const empresa = this.items.find(
      (item) => item.tokenTrocaEmailHash === hash,
    );
    return Promise.resolve(empresa ? copiar(empresa) : null);
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

    return Promise.resolve(sorted.map((item) => copiar(item)));
  }

  create(empresa: Empresa): Promise<void> {
    this.items.push(copiar(empresa));
    return Promise.resolve();
  }

  save(empresa: Empresa): Promise<void> {
    const index = this.items.findIndex((item) => item.id.equals(empresa.id));

    if (index !== -1) {
      // Espelha `PrismaEmpresaRepository.save`: status e decisão só mudam por
      // `salvarTransicao`, então uma leitura obsoleta não desfaz a decisão.
      this.items[index] = copiar(empresa, this.items[index]);
    }

    return Promise.resolve();
  }

  salvarTransicao(empresa: Empresa, estadoEsperado: string): Promise<boolean> {
    const index = this.items.findIndex((item) => item.id.equals(empresa.id));

    // CAS: espelha o `updateMany` com `status: estadoEsperado` do adaptador
    // Prisma — se outra decisão já mudou o estado guardado, nada é gravado.
    if (
      index === -1 ||
      (this.items[index].status as string) !== estadoEsperado
    ) {
      return Promise.resolve(false);
    }

    this.items[index] = copiar(empresa);
    return Promise.resolve(true);
  }
}
