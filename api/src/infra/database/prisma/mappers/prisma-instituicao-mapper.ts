import {
  Instituicao as InstituicaoPrisma,
  InstituicaoStatus as InstituicaoStatusPrisma,
  Prisma,
} from '@prisma/client';

import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Cnpj } from '@domain/fivo/entities/cnpj';
import { DocumentoValidacao } from '@domain/fivo/entities/documento-validacao';
import {
  Instituicao,
  InstituicaoStatus,
} from '@domain/fivo/entities/instituicao';

const STATUS_PARA_PRISMA: Record<InstituicaoStatus, InstituicaoStatusPrisma> = {
  [InstituicaoStatus.PENDENTE_APROVACAO]:
    InstituicaoStatusPrisma.PENDENTE_APROVACAO,
  [InstituicaoStatus.APROVADA]: InstituicaoStatusPrisma.APROVADA,
  [InstituicaoStatus.REJEITADA]: InstituicaoStatusPrisma.REJEITADA,
  [InstituicaoStatus.SUSPENSA]: InstituicaoStatusPrisma.SUSPENSA,
  [InstituicaoStatus.INATIVA]: InstituicaoStatusPrisma.INATIVA,
};

const STATUS_PARA_DOMINIO: Record<InstituicaoStatusPrisma, InstituicaoStatus> =
  {
    [InstituicaoStatusPrisma.PENDENTE_APROVACAO]:
      InstituicaoStatus.PENDENTE_APROVACAO,
    [InstituicaoStatusPrisma.APROVADA]: InstituicaoStatus.APROVADA,
    [InstituicaoStatusPrisma.REJEITADA]: InstituicaoStatus.REJEITADA,
    [InstituicaoStatusPrisma.SUSPENSA]: InstituicaoStatus.SUSPENSA,
    [InstituicaoStatusPrisma.INATIVA]: InstituicaoStatus.INATIVA,
  };

export function statusInstituicaoParaPrisma(
  estado: InstituicaoStatus,
): InstituicaoStatusPrisma {
  return STATUS_PARA_PRISMA[estado];
}

export class PrismaInstituicaoMapper {
  static toDomain(raw: InstituicaoPrisma): Instituicao {
    // CNPJ e documento já foram validados pelo domínio na criação.
    const cnpj = Cnpj.create(raw.cnpj);

    if (cnpj.isLeft()) {
      throw new Error(`CNPJ inválido persistido para a instituição ${raw.id}`);
    }

    const documento = DocumentoValidacao.criar(
      raw.documentoArquivoId,
      raw.documentoDescricao,
    );

    if (documento.isLeft()) {
      throw new Error(
        `Documento inválido persistido para a instituição ${raw.id}`,
      );
    }

    return Instituicao.create(
      {
        razaoSocial: raw.razaoSocial,
        nomeFantasia: raw.nomeFantasia,
        cnpj: cnpj.value,
        telefone: raw.telefone,
        cep: raw.cep,
        logradouro: raw.logradouro,
        numero: raw.numero,
        complemento: raw.complemento ?? undefined,
        bairro: raw.bairro,
        cidade: raw.cidade,
        uf: raw.uf,
        site: raw.site,
        contato: raw.contato,
        descricao: raw.descricao,
        causaId: new UniqueEntityId(raw.causaId),
        documento: documento.value,
        status: STATUS_PARA_DOMINIO[raw.status],
        decididoPor: raw.decididoPor
          ? new UniqueEntityId(raw.decididoPor)
          : null,
        decididoEm: raw.decididoEm,
        motivoDecisao: raw.motivoDecisao,
        usuarioId: raw.usuarioId ? new UniqueEntityId(raw.usuarioId) : null,
        logoArquivoId: raw.logoArquivoId
          ? new UniqueEntityId(raw.logoArquivoId)
          : null,
        createdAt: raw.criadoEm,
        updatedAt: raw.atualizadoEm,
      },
      new UniqueEntityId(raw.id),
    );
  }

  static toPrisma(
    instituicao: Instituicao,
  ): Prisma.InstituicaoUncheckedCreateInput {
    return {
      id: instituicao.id.toString(),
      usuarioId: instituicao.usuarioId?.toString() ?? null,
      razaoSocial: instituicao.razaoSocial,
      nomeFantasia: instituicao.nomeFantasia,
      cnpj: instituicao.cnpj.valor,
      telefone: instituicao.telefone,
      cep: instituicao.cep,
      logradouro: instituicao.logradouro,
      numero: instituicao.numero,
      complemento: instituicao.complemento ?? null,
      bairro: instituicao.bairro,
      cidade: instituicao.cidade,
      uf: instituicao.uf,
      site: instituicao.site,
      contato: instituicao.contato,
      descricao: instituicao.descricao,
      causaId: instituicao.causaId.toString(),
      logoArquivoId: instituicao.logoArquivoId?.toString() ?? null,
      documentoArquivoId: instituicao.documento.arquivoId.toString(),
      documentoDescricao: instituicao.documento.descricao,
      status: STATUS_PARA_PRISMA[instituicao.status],
      decididoPor: instituicao.decididoPor?.toString() ?? null,
      decididoEm: instituicao.decididoEm ?? null,
      motivoDecisao: instituicao.motivoDecisao ?? null,
      criadoEm: instituicao.createdAt,
      atualizadoEm: instituicao.updatedAt ?? null,
    };
  }
}
