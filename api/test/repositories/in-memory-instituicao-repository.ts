import {
  InstituicaoRepository,
  OrdenacaoListaInstituicao,
} from '@domain/fivo/application/ports/database/instituicao-repository';
import {
  Instituicao,
  InstituicaoStatus,
} from '@domain/fivo/entities/instituicao';

function copiar(
  empresa: Instituicao,
  decisao: Instituicao = empresa,
): Instituicao {
  return Instituicao.create(
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
      causaId: empresa.causaId,
      descricao: empresa.descricao,
      logoArquivoId: empresa.logoArquivoId,
      documento: empresa.documento,
      status: decisao.status,
      decididoPor: decisao.decididoPor,
      decididoEm: decisao.decididoEm,
      motivoDecisao: decisao.motivoDecisao,
    },
    empresa.id,
  );
}

export class InMemoryInstituicaoRepository implements InstituicaoRepository {
  public items: Instituicao[] = [];

  findById(id: string): Promise<Instituicao | null> {
    const instituicao = this.items.find((item) => item.id.toString() === id);
    return Promise.resolve(instituicao ? copiar(instituicao) : null);
  }

  findByCnpj(cnpj: string): Promise<Instituicao | null> {
    const instituicao = this.items.find((item) => item.cnpj.valor === cnpj);
    return Promise.resolve(instituicao ?? null);
  }

  findByUsuarioId(usuarioId: string): Promise<Instituicao | null> {
    const instituicao = this.items.find(
      (item) => item.usuarioId?.toString() === usuarioId,
    );
    return Promise.resolve(instituicao ?? null);
  }

  listarPorEstado(
    estado: InstituicaoStatus,
    ordem: OrdenacaoListaInstituicao,
  ): Promise<Instituicao[]> {
    const institucoes = this.items.filter((item) => item.status === estado);

    const sorted = [...institucoes].sort((a, b) => {
      const left = a.createdAt.getTime();
      const right = b.createdAt.getTime();
      return ordem === 'asc' ? left - right : right - left;
    });

    return Promise.resolve(sorted.map((item) => copiar(item)));
  }

  listarAprovadasPorCausa(
    causaId: string,
    ordem: OrdenacaoListaInstituicao,
  ): Promise<Instituicao[]> {
    const institucoes = this.items.filter(
      (item) =>
        item.causaId.toString() === causaId &&
        item.status === InstituicaoStatus.APROVADA,
    );

    const sorted = [...institucoes].sort((a, b) => {
      const left = a.createdAt.getTime();
      const right = b.createdAt.getTime();
      return ordem === 'asc' ? left - right : right - left;
    });

    return Promise.resolve(sorted.map((item) => copiar(item)));
  }

  buscarDisponiveis(nome: string): Promise<Instituicao[]> {
    const nomeNormalizado = nome.normalize('NFD');

    const institucoes = this.items.filter(
      (item) =>
        item.nomeFantasia === nomeNormalizado &&
        item.status === InstituicaoStatus.APROVADA,
    );

    return Promise.resolve(institucoes);
  }

  create(instituicao: Instituicao): Promise<void> {
    this.items.push(instituicao);
    return Promise.resolve();
  }

  save(instituicao: Instituicao): Promise<void> {
    const index = this.items.findIndex((item) =>
      item.id.equals(instituicao.id),
    );

    if (index !== -1) {
      this.items[index] = copiar(instituicao, this.items[index]);
    }

    return Promise.resolve();
  }

  salvarTransicao(
    instituicao: Instituicao,
    estadoEsperado: InstituicaoStatus,
  ): Promise<boolean> {
    const index = this.items.findIndex((item) =>
      item.id.equals(instituicao.id),
    );

    if (index === -1 || this.items[index].status !== estadoEsperado) {
      return Promise.resolve(false);
    }

    this.items[index] = copiar(instituicao);
    return Promise.resolve(true);
  }
}
