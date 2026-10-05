import {
  Empresa as EmpresaPrisma,
  EmpresaStatus as EmpresaStatusPrisma,
  Prisma,
} from '@prisma/client';

import { UniqueEntityId } from '@core/types/entities/unique-entity-id';
import { Cnpj } from '@domain/fivo/entities/cnpj';
import { Empresa, EmpresaStatus } from '@domain/fivo/entities/empresa';

const STATUS_PARA_PRISMA: Record<EmpresaStatus, EmpresaStatusPrisma> = {
  [EmpresaStatus.PENDENTE_APROVACAO]: EmpresaStatusPrisma.PENDENTE_APROVACAO,
  [EmpresaStatus.APROVADA]: EmpresaStatusPrisma.APROVADA,
  [EmpresaStatus.REJEITADA]: EmpresaStatusPrisma.REJEITADA,
  [EmpresaStatus.SUSPENSA]: EmpresaStatusPrisma.SUSPENSA,
};

const STATUS_PARA_DOMINIO: Record<EmpresaStatusPrisma, EmpresaStatus> = {
  [EmpresaStatusPrisma.PENDENTE_APROVACAO]: EmpresaStatus.PENDENTE_APROVACAO,
  [EmpresaStatusPrisma.APROVADA]: EmpresaStatus.APROVADA,
  [EmpresaStatusPrisma.REJEITADA]: EmpresaStatus.REJEITADA,
  [EmpresaStatusPrisma.SUSPENSA]: EmpresaStatus.SUSPENSA,
};

export function statusParaPrisma(estado: string): EmpresaStatusPrisma {
  const status = STATUS_PARA_PRISMA[estado as EmpresaStatus];

  if (!status) {
    throw new Error(`Estado de empresa desconhecido: ${estado}`);
  }

  return status;
}

export class PrismaEmpresaMapper {
  static toDomain(raw: EmpresaPrisma): Empresa {
    // A coluna guarda os 14 dígitos já validados na criação da entidade.
    const cnpj = Cnpj.create(raw.cnpj);

    if (cnpj.isLeft()) {
      throw new Error(`CNPJ inválido persistido para a empresa ${raw.id}`);
    }

    return Empresa.create(
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
        status: STATUS_PARA_DOMINIO[raw.status],
        decididoPor: raw.decididoPor
          ? new UniqueEntityId(raw.decididoPor)
          : null,
        decididoEm: raw.decididoEm,
        motivoDecisao: raw.motivoDecisao,
        emailPendente: raw.emailPendente,
        tokenTrocaEmailHash: raw.tokenTrocaEmailHash,
        tokenTrocaEmailExpiraEm: raw.tokenTrocaEmailExpiraEm,
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

  static toPrisma(empresa: Empresa): Prisma.EmpresaUncheckedCreateInput {
    return {
      id: empresa.id.toString(),
      usuarioId: empresa.usuarioId?.toString() ?? null,
      razaoSocial: empresa.razaoSocial,
      nomeFantasia: empresa.nomeFantasia,
      cnpj: empresa.cnpj.valor,
      telefone: empresa.telefone,
      cep: empresa.cep,
      logradouro: empresa.logradouro,
      numero: empresa.numero,
      complemento: empresa.complemento ?? null,
      bairro: empresa.bairro,
      cidade: empresa.cidade,
      uf: empresa.uf,
      site: empresa.site,
      contato: empresa.contato,
      logoArquivoId: empresa.logoArquivoId?.toString() ?? null,
      status: STATUS_PARA_PRISMA[empresa.status],
      decididoPor: empresa.decididoPor?.toString() ?? null,
      decididoEm: empresa.decididoEm ?? null,
      motivoDecisao: empresa.motivoDecisao ?? null,
      emailPendente: empresa.emailPendente ?? null,
      tokenTrocaEmailHash: empresa.tokenTrocaEmailHash ?? null,
      tokenTrocaEmailExpiraEm: empresa.tokenTrocaEmailExpiraEm ?? null,
      criadoEm: empresa.createdAt,
      atualizadoEm: empresa.updatedAt ?? null,
    };
  }
}
